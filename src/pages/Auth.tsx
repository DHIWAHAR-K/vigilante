import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2 } from 'lucide-react';
import { ThemeToggle } from '@/components/layout/ThemeToggle';

export default function AuthPage() {
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = (e: React.FormEvent, mode: 'login' | 'register') => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const data = new FormData(form);
    const email = data.get('email') as string;
    const password = data.get('password') as string;
    const newErrors: Record<string, string> = {};

    if (!email || !email.includes('@')) newErrors.email = 'Please enter a valid email';
    if (!password || password.length < 6) newErrors.password = 'Password must be at least 6 characters';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    setErrors({});
    setLoading(true);
    setTimeout(() => setLoading(false), 2000);
  };

  const renderForm = (mode: 'login' | 'register') => (
    <form onSubmit={(e) => handleSubmit(e, mode)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor={`${mode}-email`}>Email</Label>
        <Input id={`${mode}-email`} name="email" type="email" placeholder="you@example.com" />
        {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${mode}-password`}>Password</Label>
        <Input id={`${mode}-password`} name="password" type="password" placeholder="••••••••" />
        {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
      </div>
      {mode === 'register' && (
        <div className="space-y-2">
          <Label htmlFor="confirm-password">Confirm Password</Label>
          <Input id="confirm-password" name="confirmPassword" type="password" placeholder="••••••••" />
        </div>
      )}
      <Button type="submit" className="w-full" disabled={loading}>
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {mode === 'login' ? 'Sign In' : 'Create Account'}
      </Button>
    </form>
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-display font-bold tracking-tight">Council</h1>
          <p className="text-sm text-muted-foreground">Multi-agent debate, unified answers</p>
        </div>

        <Card>
          <CardContent className="pt-6">
            <Tabs defaultValue="login">
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="login">Sign In</TabsTrigger>
                <TabsTrigger value="register">Register</TabsTrigger>
              </TabsList>
              <TabsContent value="login">{renderForm('login')}</TabsContent>
              <TabsContent value="register">{renderForm('register')}</TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
