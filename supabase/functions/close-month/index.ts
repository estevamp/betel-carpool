import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Profile {
  id: string;
  full_name: string;
  sex: "Homem" | "Mulher" | null;
  is_married: boolean;
  is_exempt: boolean;
  spouse_id: string | null;
  pix_key: string | null;
}

interface TripPassenger {
  trip_id: string;
  passenger_id: string;
  trip_type: "Ida e Volta" | "Apenas Ida" | "Apenas Volta";
}

interface Trip {
  id: string;
  driver_id: string;
  is_betel_car: boolean;
  departure_at: string;
}

const ROUND_TRIP_COST = 15.0;
const ONE_WAY_COST = 7.5;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify the user is an admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if user is admin
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .single();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Unauthorized - Admin only" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { month } = await req.json();
    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return new Response(JSON.stringify({ error: "Invalid month format. Use YYYY-MM" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Processing month: ${month}`);

    // Parse month to get date range
    const [year, monthNum] = month.split("-").map(Number);
    const monthStart = new Date(year, monthNum - 1, 1);
    const monthEnd = new Date(year, monthNum, 0, 23, 59, 59, 999);

    // Fetch all profiles
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, full_name, sex, is_married, is_exempt, spouse_id, pix_key");

    if (profilesError) throw profilesError;

    const profileMap = new Map<string, Profile>(
      (profiles as Profile[]).map((p) => [p.id, p])
    );

    // Fetch trips for the month
    const { data: trips, error: tripsError } = await supabase
      .from("trips")
      .select("id, driver_id, is_betel_car, departure_at")
      .gte("departure_at", monthStart.toISOString())
      .lte("departure_at", monthEnd.toISOString());

    if (tripsError) throw tripsError;

    console.log(`Found ${trips?.length || 0} trips for month ${month}`);

    // Fetch all passengers for these trips
    const tripIds = (trips as Trip[]).map((t) => t.id);
    const { data: passengers, error: passengersError } = await supabase
      .from("trip_passengers")
      .select("trip_id, passenger_id, trip_type")
      .in("trip_id", tripIds);

    if (passengersError) throw passengersError;

    console.log(`Found ${passengers?.length || 0} passenger records`);

    // Create trip lookup
    const tripMap = new Map<string, Trip>(
      (trips as Trip[]).map((t) => [t.id, t])
    );

    // Calculate raw debts (passenger -> driver)
    // debtorId -> creditorId -> amount
    const rawDebts = new Map<string, Map<string, number>>();

    for (const passenger of (passengers as TripPassenger[])) {
      const trip = tripMap.get(passenger.trip_id);
      if (!trip) continue;

      const passengerProfile = profileMap.get(passenger.passenger_id);
      const driverProfile = profileMap.get(trip.driver_id);

      if (!passengerProfile || !driverProfile) continue;

      // Skip if it's a Betel car (free ride)
      if (trip.is_betel_car) {
        console.log(`Skipping passenger ${passengerProfile.full_name} - Betel car`);
        continue;
      }

      // Skip if passenger is exempt
      if (passengerProfile.is_exempt) {
        console.log(`Skipping passenger ${passengerProfile.full_name} - is_exempt`);
        continue;
      }

      // Skip if driver is the same as passenger
      if (passenger.passenger_id === trip.driver_id) continue;

      // Calculate cost based on trip type
      const cost = passenger.trip_type === "Ida e Volta" ? ROUND_TRIP_COST : ONE_WAY_COST;

      // Determine who pays: if woman is married, her husband pays
      let debtorId = passenger.passenger_id;
      if (passengerProfile.sex === "Mulher" && passengerProfile.is_married && passengerProfile.spouse_id) {
        debtorId = passengerProfile.spouse_id;
        console.log(`Consolidating ${passengerProfile.full_name}'s debt to spouse`);
      }

      // Add to debts
      if (!rawDebts.has(debtorId)) {
        rawDebts.set(debtorId, new Map());
      }
      const debtorDebts = rawDebts.get(debtorId)!;
      const currentDebt = debtorDebts.get(trip.driver_id) || 0;
      debtorDebts.set(trip.driver_id, currentDebt + cost);
    }

    // Generate transactions
    const transactions: Array<{
      debtor_id: string;
      creditor_id: string;
      amount: number;
      month: string;
      trip_type: string;
    }> = [];

    for (const [debtorId, creditorMap] of rawDebts) {
      for (const [creditorId, amount] of creditorMap) {
        transactions.push({
          debtor_id: debtorId,
          creditor_id: creditorId,
          amount,
          month,
          trip_type: "Ida e Volta", // simplified for now
        });
      }
    }

    console.log(`Generated ${transactions.length} transactions`);

    // Delete existing transactions for this month
    const { error: deleteTransError } = await supabase
      .from("transactions")
      .delete()
      .eq("month", month);

    if (deleteTransError) throw deleteTransError;

    // Insert new transactions
    if (transactions.length > 0) {
      const { error: insertTransError } = await supabase
        .from("transactions")
        .insert(transactions);

      if (insertTransError) throw insertTransError;
    }

    // Calculate net balances for transfer optimization
    const netBalances = new Map<string, number>(); // positive = to receive, negative = to pay

    for (const [debtorId, creditorMap] of rawDebts) {
      for (const [creditorId, amount] of creditorMap) {
        // Debtor loses money
        netBalances.set(debtorId, (netBalances.get(debtorId) || 0) - amount);
        // Creditor gains money
        netBalances.set(creditorId, (netBalances.get(creditorId) || 0) + amount);
      }
    }

    // Separate into debtors (negative balance) and creditors (positive balance)
    const debtors: Array<{ id: string; amount: number }> = [];
    const creditors: Array<{ id: string; amount: number }> = [];

    for (const [id, balance] of netBalances) {
      if (balance < -0.01) {
        debtors.push({ id, amount: Math.abs(balance) });
      } else if (balance > 0.01) {
        creditors.push({ id, amount: balance });
      }
    }

    // Sort by amount (largest first) for better matching
    debtors.sort((a, b) => b.amount - a.amount);
    creditors.sort((a, b) => b.amount - a.amount);

    // Generate optimized transfers (minimize number of transactions)
    const transfers: Array<{
      debtor_id: string;
      creditor_id: string;
      amount: number;
      month: string;
    }> = [];

    let i = 0, j = 0;
    while (i < debtors.length && j < creditors.length) {
      const debtor = debtors[i];
      const creditor = creditors[j];
      
      const transferAmount = Math.min(debtor.amount, creditor.amount);
      
      if (transferAmount > 0.01) {
        transfers.push({
          debtor_id: debtor.id,
          creditor_id: creditor.id,
          amount: Math.round(transferAmount * 100) / 100, // Round to 2 decimals
          month,
        });
      }

      debtor.amount -= transferAmount;
      creditor.amount -= transferAmount;

      if (debtor.amount < 0.01) i++;
      if (creditor.amount < 0.01) j++;
    }

    console.log(`Generated ${transfers.length} optimized transfers`);

    // Delete existing transfers for this month
    const { error: deleteTransfersError } = await supabase
      .from("transfers")
      .delete()
      .eq("month", month);

    if (deleteTransfersError) throw deleteTransfersError;

    // Insert new transfers
    if (transfers.length > 0) {
      const { error: insertTransfersError } = await supabase
        .from("transfers")
        .insert(transfers);

      if (insertTransfersError) throw insertTransfersError;
    }

    // Clean up old data (> 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const cutoffMonth = `${sixMonthsAgo.getFullYear()}-${String(sixMonthsAgo.getMonth() + 1).padStart(2, "0")}`;

    console.log(`Cleaning up data older than ${cutoffMonth}`);

    const { error: cleanupTransError } = await supabase
      .from("transactions")
      .delete()
      .lt("month", cutoffMonth);

    if (cleanupTransError) {
      console.error("Error cleaning up old transactions:", cleanupTransError);
    }

    const { error: cleanupTransfersError } = await supabase
      .from("transfers")
      .delete()
      .lt("month", cutoffMonth);

    if (cleanupTransfersError) {
      console.error("Error cleaning up old transfers:", cleanupTransfersError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        month,
        transactionsCount: transactions.length,
        transfersCount: transfers.length,
        message: `Fechamento do mês ${month} realizado com sucesso!`,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: unknown) {
    console.error("Error in close-month:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
