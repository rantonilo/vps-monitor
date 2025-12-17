"use client";

import { useState } from "react";
import { signIn } from "next-auth/react"; // We need client side signIn? Or handle manually? 
// NextAuth v5 recommends using Server Actions for pure form submission or "signIn" from "next-auth/react" for client side.
// We will use standard form submission to NextAuth.

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import Link from "next/link";

export default function LoginPage() {
    const [formData, setFormData] = useState({ email: "", password: "" });
    const [error, setError] = useState("");
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        // Use NextAuth signIn
        // Since we are in app router, imported from next-auth/react (need SessionProvider? No, basic signIn works)
        // Actually, we can just fetch the auth endpoint? 
        // Or simpler: use the documented 'next-auth/react' signIn 
        // But we need to install 'next-auth' client side compatible if using v5 beta?
        // v5 beta provides 'next-auth/react' exports.

        // Wait, standard usage:

        try {
            // We'll trust the import is available.
            // However, if we don't have SessionProvider, we might just call the API.
            // Let's rely on importing signIn dynamically to avoid SSR issues if any, or just import at top.
            const { signIn } = await import("next-auth/react");
            const res = await signIn("credentials", {
                email: formData.email,
                password: formData.password,
                redirect: false,
            });

            if (res && !res.error) {
                router.push("/");
                router.refresh();
            } else {
                setError("Invalid credentials");
            }
        } catch (e) {
            setError("Something went wrong");
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-background">
            <Card className="w-[350px]">
                <CardHeader>
                    <CardTitle>Welcome Back</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password">Password</Label>
                            <Input
                                id="password"
                                type="password"
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                required
                            />
                        </div>
                        {error && <p className="text-red-500 text-sm">{error}</p>}
                        <Button type="submit" className="w-full">Sign In</Button>
                        <p className="text-center text-sm text-gray-500">
                            No account? <Link href="/register" className="underline">Register</Link>
                        </p>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
