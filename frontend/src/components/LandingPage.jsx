import { useState } from 'react';
import { Eye, EyeOff, Sprout, Map, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function LandingPage({ onAuthSuccess }) {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const endpoint = isLogin ? `${API}/auth/login` : `${API}/auth/register`;
      const payload = isLogin 
        ? { email: formData.email, password: formData.password }
        : formData;

      const response = await axios.post(endpoint, payload);
      
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      
      toast.success(isLogin ? 'Welcome back!' : 'Account created successfully!');
      onAuthSuccess();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-green-50 to-emerald-50">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-12">
        <div className="grid lg:grid-cols-2 gap-12 items-center min-h-[calc(100vh-96px)]">
          {/* Left Side - Company Info */}
          <div className="space-y-8">
            <div className="flex items-center space-x-3">
              <div className="w-14 h-14 bg-gradient-to-br from-sky-500 to-green-600 rounded-2xl flex items-center justify-center shadow-lg">
                <Sprout className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-sky-600 to-green-600 bg-clip-text text-transparent">
                Maplink
              </h1>
            </div>

            <div className="space-y-4">
              <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-800 leading-tight">
                Smart Agriculture
                <span className="block text-sky-600">Field Monitoring</span>
              </h2>
              <p className="text-lg text-gray-600 max-w-xl">
                Monitor crop health, track field boundaries, and optimize agricultural productivity with advanced mapping technology.
              </p>
            </div>

            {/* Features */}
            <div className="grid gap-4 mt-8">
              <div className="flex items-start space-x-4 p-4 bg-white/60 backdrop-blur-sm rounded-xl border border-sky-100 shadow-sm hover:shadow-md transition-shadow">
                <div className="w-12 h-12 bg-sky-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Map className="w-6 h-6 text-sky-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800 mb-1">Interactive Field Mapping</h3>
                  <p className="text-sm text-gray-600">Draw and manage field boundaries with precision mapping tools</p>
                </div>
              </div>

              <div className="flex items-start space-x-4 p-4 bg-white/60 backdrop-blur-sm rounded-xl border border-green-100 shadow-sm hover:shadow-md transition-shadow">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <TrendingUp className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800 mb-1">Health Index Monitoring</h3>
                  <p className="text-sm text-gray-600">Track crop health metrics and growth patterns over time</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Side - Auth Form */}
          <div className="flex justify-center lg:justify-end">
            <div className="w-full max-w-md">
              <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-2xl p-8 border border-white/20">
                <div className="text-center mb-8">
                  <h3 className="text-2xl font-bold text-gray-800 mb-2">
                    {isLogin ? 'Welcome Back' : 'Get Started'}
                  </h3>
                  <p className="text-gray-600">
                    {isLogin ? 'Sign in to your account' : 'Create your account'}
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                  {!isLogin && (
                    <div className="space-y-2">
                      <Label htmlFor="name" className="text-gray-700">Full Name</Label>
                      <Input
                        id="name"
                        name="name"
                        type="text"
                        placeholder="John Doe"
                        value={formData.name}
                        onChange={handleChange}
                        required={!isLogin}
                        data-testid="signup-name-input"
                        className="h-11 border-gray-200 focus:border-sky-500"
                      />
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-gray-700">Email</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="you@example.com"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      data-testid={isLogin ? "login-email-input" : "signup-email-input"}
                      className="h-11 border-gray-200 focus:border-sky-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-gray-700">Password</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        name="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={formData.password}
                        onChange={handleChange}
                        required
                        data-testid={isLogin ? "login-password-input" : "signup-password-input"}
                        className="h-11 pr-10 border-gray-200 focus:border-sky-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                        data-testid="toggle-password-visibility"
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={loading}
                    data-testid={isLogin ? "login-submit-button" : "signup-submit-button"}
                    className="w-full h-11 bg-gradient-to-r from-sky-500 to-green-600 hover:from-sky-600 hover:to-green-700 text-white font-medium shadow-lg hover:shadow-xl transition-all"
                  >
                    {loading ? 'Processing...' : (isLogin ? 'Sign In' : 'Create Account')}
                  </Button>
                </form>

                <div className="mt-6 text-center">
                  <button
                    onClick={() => setIsLogin(!isLogin)}
                    data-testid="toggle-auth-mode"
                    className="text-sm text-gray-600 hover:text-sky-600 transition-colors"
                  >
                    {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
