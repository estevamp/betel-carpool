import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function DebugProfilesPage() {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      // Get current user
      const { data: userData } = await supabase.auth.getUser();
      setCurrentUser(userData.user);

      // Try to get all profiles (will be filtered by RLS)
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (profilesError) {
        setError(`Error loading profiles: ${profilesError.message}`);
        console.error("Profiles error:", profilesError);
      } else {
        setProfiles(profilesData || []);
      }

      // Try to find unlinked profile with current user's email
      if (userData.user?.email) {
        const { data: unlinkedProfile, error: unlinkedError } = await supabase
          .from("profiles")
          .select("*")
          .eq("email", userData.user.email.toLowerCase())
          .is("user_id", null)
          .maybeSingle();

        console.log("Unlinked profile search:", { unlinkedProfile, unlinkedError });
      }
    } catch (err) {
      setError(`Exception: ${err}`);
      console.error("Exception:", err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Debug: Current User</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="bg-gray-100 p-4 rounded overflow-auto">
            {JSON.stringify(currentUser, null, 2)}
          </pre>
        </CardContent>
      </Card>

      {error && (
        <Card className="border-red-500">
          <CardHeader>
            <CardTitle className="text-red-500">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p>{error}</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Debug: Profiles (filtered by RLS)</CardTitle>
          <Button onClick={loadData} variant="outline" size="sm">
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
          <p className="mb-4">Total profiles visible: {profiles.length}</p>
          <div className="space-y-4">
            {profiles.map((profile) => (
              <div key={profile.id} className="bg-gray-100 p-4 rounded">
                <p><strong>Name:</strong> {profile.full_name}</p>
                <p><strong>Email:</strong> {profile.email}</p>
                <p><strong>User ID:</strong> {profile.user_id || "(null - unlinked)"}</p>
                <p><strong>Congregation ID:</strong> {profile.congregation_id}</p>
                <p><strong>Created:</strong> {new Date(profile.created_at).toLocaleString()}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
