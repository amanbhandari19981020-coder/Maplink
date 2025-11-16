import { useState } from 'react';
import { Eye, EyeOff, Sprout, Map, TrendingUp, Users, Globe, Award, ChevronRight, Leaf, CloudSun } from 'lucide-react';
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
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50">
      {/* Header */}
      <header className="border-b border-green-100 bg-white/60 backdrop-blur-md">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gradient-to-br from-green-600 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
                <Sprout className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-green-700 to-emerald-600 bg-clip-text text-transparent">
                  Maplink
                </h1>
                <p className="text-xs text-gray-600">Agricultural Innovation Leader</p>
              </div>
            </div>
            <nav className="hidden md:flex items-center space-x-6 text-sm">
              <a href="#about" className="text-gray-700 hover:text-green-700 transition-colors">About</a>
              <a href="#features" className="text-gray-700 hover:text-green-700 transition-colors">Solutions</a>
              <a href="#stats" className="text-gray-700 hover:text-green-700 transition-colors">Impact</a>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-6 py-16">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Side - Company Info */}
          <div className="space-y-8">
            <div className="inline-flex items-center space-x-2 bg-green-100 px-4 py-2 rounded-full">
              <Award className="w-4 h-4 text-green-700" />
              <span className="text-sm font-medium text-green-800">Industry Leading AgriTech Platform</span>
            </div>

            <div className="space-y-6">
              <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight">
                Precision Agriculture
                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-emerald-600 mt-2">
                  Field Monitoring
                </span>
              </h2>
              <p className="text-lg text-gray-700 leading-relaxed max-w-xl">
                Transform agricultural productivity with our advanced satellite mapping, AI-powered crop health analytics, and real-time field monitoring solutions trusted by farmers worldwide.
              </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-6 pt-4">
              <div className="space-y-1">
                <div className="text-3xl font-bold text-green-700">50K+</div>
                <div className="text-sm text-gray-600">Active Farms</div>
              </div>
              <div className="space-y-1">
                <div className="text-3xl font-bold text-green-700">2M+</div>
                <div className="text-sm text-gray-600">Acres Monitored</div>
              </div>
              <div className="space-y-1">
                <div className="text-3xl font-bold text-green-700">98%</div>
                <div className="text-sm text-gray-600">Satisfaction</div>
              </div>
            </div>

            {/* Features */}
            <div className="grid gap-4 pt-4">
              <div className="flex items-start space-x-4 p-5 bg-white/70 backdrop-blur-sm rounded-2xl border border-green-100 shadow-md hover:shadow-lg transition-all">
                <div className="w-14 h-14 bg-gradient-to-br from-green-100 to-emerald-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Globe className="w-7 h-7 text-green-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-gray-900 mb-2 text-lg">Satellite & Drone Mapping</h3>
                  <p className="text-sm text-gray-600">High-resolution field imagery with real-time boundary tracking and multi-layer visualization</p>
                </div>
              </div>

              <div className="flex items-start space-x-4 p-5 bg-white/70 backdrop-blur-sm rounded-2xl border border-green-100 shadow-md hover:shadow-lg transition-all">
                <div className="w-14 h-14 bg-gradient-to-br from-green-100 to-emerald-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <TrendingUp className="w-7 h-7 text-green-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-gray-900 mb-2 text-lg">AI Crop Health Analytics</h3>
                  <p className="text-sm text-gray-600">Advanced algorithms analyze vegetation indices, soil moisture, and growth patterns</p>
                </div>
              </div>

              <div className="flex items-start space-x-4 p-5 bg-white/70 backdrop-blur-sm rounded-2xl border border-green-100 shadow-md hover:shadow-lg transition-all">
                <div className="w-14 h-14 bg-gradient-to-br from-green-100 to-emerald-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <CloudSun className="w-7 h-7 text-green-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-gray-900 mb-2 text-lg">Weather & Climate Integration</h3>
                  <p className="text-sm text-gray-600">Predictive insights with localized weather data and climate impact forecasting</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Side - Auth Form */}
          <div className="flex justify-center lg:justify-end">
            <div className="w-full max-w-md">
              <div className="bg-white/90 backdrop-blur-md rounded-3xl shadow-2xl p-10 border-2 border-green-100">
                <div className="text-center mb-8">
                  <div className="w-16 h-16 bg-gradient-to-br from-green-600 to-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                    <Leaf className="w-9 h-9 text-white" />
                  </div>
                  <h3 className="text-3xl font-bold text-gray-900 mb-2">
                    {isLogin ? 'Welcome Back' : 'Start Growing'}
                  </h3>
                  <p className="text-gray-600">
                    {isLogin ? 'Access your dashboard' : 'Join thousands of farmers'}
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                  {!isLogin && (
                    <div className="space-y-2">
                      <Label htmlFor="name" className="text-gray-800 font-medium">Full Name</Label>
                      <Input
                        id="name"
                        name="name"
                        type="text"
                        placeholder="John Farmer"
                        value={formData.name}
                        onChange={handleChange}
                        required={!isLogin}
                        data-testid="signup-name-input"
                        className="h-12 border-2 border-gray-200 focus:border-green-500 rounded-xl"
                      />
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-gray-800 font-medium">Email Address</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="you@farm.com"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      data-testid={isLogin ? "login-email-input" : "signup-email-input"}
                      className="h-12 border-2 border-gray-200 focus:border-green-500 rounded-xl"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-gray-800 font-medium">Password</Label>
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
                        className="h-12 pr-12 border-2 border-gray-200 focus:border-green-500 rounded-xl"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
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
                    className="w-full h-12 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all text-base"
                  >
                    {loading ? 'Processing...' : (isLogin ? 'Sign In' : 'Create Account')}
                    <ChevronRight className="w-5 h-5 ml-2" />
                  </Button>
                </form>

                <div className="mt-8 text-center">
                  <button
                    onClick={() => setIsLogin(!isLogin)}
                    data-testid="toggle-auth-mode"
                    className="text-sm text-gray-600 hover:text-green-700 transition-colors font-medium"
                  >
                    {isLogin ? "New to Maplink? Create account" : "Already registered? Sign in"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Section */}
      <section className="container mx-auto px-6 py-12 border-t border-green-100 bg-white/40 backdrop-blur-sm">
        <div className="text-center mb-8">
          <p className="text-sm text-gray-600 font-medium mb-4">TRUSTED BY LEADING ORGANIZATIONS</p>
          <div className="flex flex-wrap justify-center items-center gap-8 opacity-60">
            <div className="text-2xl font-bold text-gray-700">AGRI CORP</div>
            <div className="text-2xl font-bold text-gray-700">FARMTECH</div>
            <div className="text-2xl font-bold text-gray-700">CROP SOLUTIONS</div>
            <div className="text-2xl font-bold text-gray-700">GREEN VALLEY</div>
          </div>
        </div>
      </section>
    </div>
  );
}
