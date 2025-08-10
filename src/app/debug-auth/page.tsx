"use client";

import { useSession, signIn, signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function DebugAuthPage() {
  const { data: session, status } = useSession();

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4">
        <Card>
          <CardHeader>
            <CardTitle>🔍 Authentication Debug Page</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-2">Session Status</h3>
              <div className="bg-gray-100 p-4 rounded-lg font-mono text-sm">
                <p><strong>Status:</strong> {status}</p>
                <p><strong>Has Session:</strong> {session ? "Yes" : "No"}</p>
                <p><strong>User ID:</strong> {session?.user?.id || "None"}</p>
                <p><strong>User Name:</strong> {session?.user?.name || "None"}</p>
                <p><strong>User Email:</strong> {session?.user?.email || "None"}</p>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-2">Full Session Data</h3>
              <pre className="bg-gray-100 p-4 rounded-lg text-xs overflow-auto">
                {JSON.stringify(session, null, 2)}
              </pre>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Authentication Actions</h3>
              {!session ? (
                <Button onClick={() => signIn("google")}>
                  Sign In with Google
                </Button>
              ) : (
                <div className="space-x-4">
                  <Button variant="outline" onClick={() => window.open("/profile", "_blank")}>
                    Test Profile Page
                  </Button>
                  <Button variant="outline" onClick={() => window.open("/trips", "_blank")}>
                    Test Trips Page
                  </Button>
                  <Button variant="destructive" onClick={() => signOut()}>
                    Sign Out
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}