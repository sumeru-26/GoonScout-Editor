import Link from "next/link";
import { Chrome, Github } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="flex min-h-screen items-center justify-center p-6 lg:p-12">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-2 text-center">
            <CardTitle>Sign in</CardTitle>
            <CardDescription>
              Enter your email below to access your account.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-2">
              <Button variant="outline" className="w-full">
                <Chrome className="h-4 w-4" />
                Continue with Google
              </Button>
              <Button variant="outline" className="w-full">
                <Github className="h-4 w-4" />
                Continue with GitHub
              </Button>
            </div>

            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@goonscout.io"
                  autoComplete="email"
                  required
                />
              </div>
              <div className="grid gap-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <Link
                    href="#"
                    className="text-xs text-muted-foreground underline-offset-4 hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  required
                />
              </div>
              <Link
                href="/"
                className={buttonVariants({ className: "w-full" })}
              >
                Sign in
              </Link>
            </div>

            <p className="text-center text-sm text-muted-foreground">
              New to GoonScout?{" "}
              <Link
                href="/signup"
                className="font-medium text-foreground underline-offset-4 hover:underline"
              >
                Create an account
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
