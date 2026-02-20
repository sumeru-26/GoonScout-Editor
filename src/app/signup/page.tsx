"use client";

import * as React from "react";
import Link from "next/link";
import { Chrome, Github } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { authClient } from "@/lib/auth-client";

export default function SignupPage() {
  const [error, setError] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const handleSocialSignIn = async (provider: "google" | "github") => {
    setIsSubmitting(true);
    setError(null);
    const { error: signInError } = await authClient.signIn.social({
      provider,
      callbackURL: "/projectManager",
    });
    if (signInError) {
      setError(signInError.message);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="flex min-h-screen items-center justify-center p-6 lg:p-12">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-2 text-center">
            <CardTitle>Create account</CardTitle>
            <CardDescription>
              Start tracking scouting data in minutes.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-2">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => handleSocialSignIn("google")}
                disabled={isSubmitting}
              >
                <Chrome className="h-4 w-4" />
                Continue with Google
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => handleSocialSignIn("github")}
                disabled={isSubmitting}
              >
                <Github className="h-4 w-4" />
                Continue with GitHub
              </Button>
            </div>

            {error ? (
              <p className="text-center text-xs text-red-400">{error}</p>
            ) : null}

            <p className="text-center text-xs text-muted-foreground">
              By continuing, you agree to our Terms of Service and Privacy
              Policy.
            </p>

            <p className="text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link
                href="/login"
                className="font-medium text-foreground underline-offset-4 hover:underline"
              >
                Sign in
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
