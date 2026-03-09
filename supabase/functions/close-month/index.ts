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
  congregation_id: string | null;
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
  congregation_id: string | null;
}

const ROUND_TRIP_COST = 15.0;
const ONE_WAY_COST = 7.5;

// ============================================================
// Union-Find helpers for connected component detection
// ============================================================
function makeUnionFind() {
  const parent = new Map<string, string>();

  function find(x: string): string {
    if (!parent.has(x)) parent.set(x, x);
    if (parent.get(x) !== x) parent.set(x, find(parent.get(x)!));
    return parent.get(x)!;
  }

  function union(x: string, y: string) {
    const px = find(x);
    const py = find(y);
    if (px !== py) parent.set(px, py);
  }

  return { find, union };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseSecretKey =
      Deno.env.get("SUPABASE_SECRET_KEY") ??
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ??
      "";
    const supabase = createClient(supabaseUrl, supabaseSecretKey);

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
      .in("role", ["admin", "super_admin"])
      .limit(1);

    if (!roleData || roleData.length === 0) {
      return new Response(JSON.stringify({ error: "Unauthorized - Admin only" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { month, congregation_id } = await req.json();
    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return new Response(JSON.stringify({ error: "Invalid month format. Use YYYY-MM" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get user's congregation if not super_admin
    const isSuperAdmin = roleData.some((r: { role: string }) => r.role === "super_admin");

    let targetCongregationId: string;
    if (isSuperAdmin && congregation_id) {
      targetCongregationId = congregation_id;
    } else {
      // profiles.id is not always auth user id in this project.
      // Resolve by user_id first, then fallback to legacy id linkage.
      let profileData: { congregation_id: string | null } | null = null;
      const { data: byUserId } = await supabase
        .from("profiles")
        .select("congregation_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (byUserId) {
        profileData = byUserId;
      } else {
        const { data: byId } = await supabase
          .from("profiles")
          .select("congregation_id")
          .eq("id", user.id)
          .maybeSingle();
        profileData = byId;
      }

      if (!profileData?.congregation_id) {
        return new Response(JSON.stringify({ error: "User has no congregation" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      targetCongregationId = congregation_id ?? profileData.congregation_id;
    }

    console.log(`Closing month ${month} for congregation ${targetCongregationId}`);

    // Fetch profiles for this congregation
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, full_name, sex, is_married, is_exempt, spouse_id, pix_key, congregation_id")
      .eq("congregation_id", targetCongregationId);

    if (profilesError) throw profilesError;

    const profileMap = new Map<string, Profile>(
      (profiles as Profile[]).map((p) => [p.id, p])
    );

    // Fetch trips for this month and congregation
    const startDate = `${month}-01`;
    const [year, monthNum] = month.split("-").map(Number);
    const endDate = new Date(year, monthNum, 0).toISOString().split("T")[0];

    const { data: trips, error: tripsError } = await supabase
      .from("trips")
      .select("id, driver_id, is_betel_car, departure_at, congregation_id")
      .eq("congregation_id", targetCongregationId)
      .gte("departure_at", startDate)
      .lte("departure_at", `${endDate}T23:59:59`);

    if (tripsError) throw tripsError;

    console.log(`Found ${trips?.length ?? 0} trips`);

    // Fetch passengers for those trips
    let passengers: TripPassenger[] = [];
    if (trips && trips.length > 0) {
      const tripIds = (trips as Trip[]).map((t) => t.id);
      const { data: passengersData, error: passengersError } = await supabase
        .from("trip_passengers")
        .select("trip_id, passenger_id, trip_type")
        .in("trip_id", tripIds);

      if (passengersError) throw passengersError;
      passengers = (passengersData as TripPassenger[]) ?? [];
    }

    console.log(`Found ${passengers.length} passenger records`);

    // Create trip lookup
    const tripMap = new Map<string, Trip>(
      (trips as Trip[]).map((t) => [t.id, t])
    );

    // Calculate raw debts (passenger -> driver)
    const rawDebts = new Map<string, Map<string, number>>();

    for (const passenger of passengers) {
      const trip = tripMap.get(passenger.trip_id);
      if (!trip) continue;

      const passengerProfile = profileMap.get(passenger.passenger_id);
      const driverProfile = profileMap.get(trip.driver_id);

      if (!passengerProfile || !driverProfile) continue;

      if (trip.is_betel_car) continue;
      if (passengerProfile.is_exempt) continue;
      if (passenger.passenger_id === trip.driver_id) continue;

      const cost = passenger.trip_type === "Ida e Volta" ? ROUND_TRIP_COST : ONE_WAY_COST;

      let debtorId = passenger.passenger_id;
      if (passengerProfile.sex === "Mulher" && passengerProfile.is_married && passengerProfile.spouse_id) {
        debtorId = passengerProfile.spouse_id;
      }

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
      congregation_id: string;
    }> = [];

    for (const [debtorId, creditorMap] of rawDebts) {
      for (const [creditorId, amount] of creditorMap) {
        transactions.push({
          debtor_id: debtorId,
          creditor_id: creditorId,
          amount,
          month,
          trip_type: "Ida e Volta",
          congregation_id: targetCongregationId,
        });
      }
    }

    console.log(`Generated ${transactions.length} transactions`);

    // Delete existing transactions for this month AND congregation only
    const { error: deleteTransError } = await supabase
      .from("transactions")
      .delete()
      .eq("month", month)
      .eq("congregation_id", targetCongregationId);

    if (deleteTransError) throw deleteTransError;

    if (transactions.length > 0) {
      const { error: insertTransError } = await supabase
        .from("transactions")
        .insert(transactions);
      if (insertTransError) throw insertTransError;
    }

    // ============================================================
    // SMART TRANSFER OPTIMIZATION WITH CONNECTED COMPONENTS
    //
    // Problem with naive global net-balance approach:
    //   If A→B (R$50) and C→D (R$50) are independent debts,
    //   a global greedy match could incorrectly produce A→D and C→B.
    //
    // Solution: Use Union-Find to identify connected components.
    //   Only merge/optimize debts within the same component.
    //   Independent chains (A→B, C→D, E→F) stay separate.
    //   Chains sharing a person (A→B, B→C) get optimized together.
    // ============================================================

    const { find, union } = makeUnionFind();

    // Step 1: Union every debtor with their creditors to find connected groups
    for (const [debtorId, creditorMap] of rawDebts) {
      for (const creditorId of creditorMap.keys()) {
        union(debtorId, creditorId);
      }
    }

    // Step 2: Compute net balances grouped by connected component
    // componentNetBalances: componentRoot -> (personId -> netBalance)
    const componentNetBalances = new Map<string, Map<string, number>>();

    for (const [debtorId, creditorMap] of rawDebts) {
      for (const [creditorId, amount] of creditorMap) {
        const component = find(debtorId); // same root as find(creditorId)

        if (!componentNetBalances.has(component)) {
          componentNetBalances.set(component, new Map());
        }
        const balMap = componentNetBalances.get(component)!;

        balMap.set(debtorId, (balMap.get(debtorId) ?? 0) - amount);
        balMap.set(creditorId, (balMap.get(creditorId) ?? 0) + amount);
      }
    }

    // Step 3: For each component independently, apply greedy matching
    const transfers: Array<{
      debtor_id: string;
      creditor_id: string;
      amount: number;
      month: string;
      congregation_id: string;
    }> = [];

    for (const [, balMap] of componentNetBalances) {
      const compDebtors: Array<{ id: string; amount: number }> = [];
      const compCreditors: Array<{ id: string; amount: number }> = [];

      for (const [id, balance] of balMap) {
        if (balance < -0.01) {
          compDebtors.push({ id, amount: Math.abs(balance) });
        } else if (balance > 0.01) {
          compCreditors.push({ id, amount: balance });
        }
      }

      // Sort descending so largest debts are settled first
      compDebtors.sort((a, b) => b.amount - a.amount);
      compCreditors.sort((a, b) => b.amount - a.amount);

      let i = 0, j = 0;
      while (i < compDebtors.length && j < compCreditors.length) {
        const debtor = compDebtors[i];
        const creditor = compCreditors[j];
        const transferAmount = Math.min(debtor.amount, creditor.amount);

        if (transferAmount > 0.01) {
          transfers.push({
            debtor_id: debtor.id,
            creditor_id: creditor.id,
            amount: Math.round(transferAmount * 100) / 100,
            month,
            congregation_id: targetCongregationId,
          });
        }

        debtor.amount -= transferAmount;
        creditor.amount -= transferAmount;

        if (debtor.amount < 0.01) i++;
        if (creditor.amount < 0.01) j++;
      }
    }

    console.log(`Generated ${transfers.length} optimized transfers`);

    // Delete existing transfers for this month AND congregation only
    const { error: deleteTransfersError } = await supabase
      .from("transfers")
      .delete()
      .eq("month", month)
      .eq("congregation_id", targetCongregationId);

    if (deleteTransfersError) throw deleteTransfersError;

    if (transfers.length > 0) {
      const { error: insertTransfersError } = await supabase
        .from("transfers")
        .insert(transfers);
      if (insertTransfersError) throw insertTransfersError;
    }

    // Clean up old data (> 6 months) for this congregation only
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const cutoffMonth = `${sixMonthsAgo.getFullYear()}-${String(sixMonthsAgo.getMonth() + 1).padStart(2, "0")}`;

    await supabase
      .from("transactions")
      .delete()
      .lt("month", cutoffMonth)
      .eq("congregation_id", targetCongregationId);

    await supabase
      .from("transfers")
      .delete()
      .lt("month", cutoffMonth)
      .eq("congregation_id", targetCongregationId);

    // Clean up old ride requests (before today) for this congregation
    const today = new Date().toISOString().split('T')[0];
    const { error: cleanupRideError } = await supabase
      .from("ride_requests")
      .delete()
      .lt("requested_date", today)
      .eq("congregation_id", targetCongregationId);

    if (cleanupRideError) {
      console.error("Error cleaning up ride requests:", cleanupRideError);
    }

    // Clean up absences that have already ended (end_date <= today) for this congregation
    const { error: cleanupAbsencesError } = await supabase
      .from("absences")
      .delete()
      .lte("end_date", today)
      .eq("congregation_id", targetCongregationId);

    if (cleanupAbsencesError) {
      console.error("Error cleaning up absences:", cleanupAbsencesError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        month,
        congregation_id: targetCongregationId,
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
