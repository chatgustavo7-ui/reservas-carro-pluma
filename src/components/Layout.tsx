import { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Car, Calendar, MapPin, Settings, BarChart3, CheckCircle, Users, FileText, Wrench, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface LayoutProps {
  children: ReactNode;
  title?: string;
}

const Layout = ({ children, title }: LayoutProps) => {
  const location = useLocation();

  const navigation = [
    {
      name: 'Nova Reserva',
      href: '/',
      icon: Car,
      current: location.pathname === '/'
    },
    {
      name: 'Dashboard',
      href: '/dashboard',
      icon: BarChart3,
      current: location.pathname === '/dashboard'
    },
    {
      name: 'Ver Reservas',
      href: '/reservas',
      icon: Calendar,
      current: location.pathname === '/reservas'
    },
    {
      name: 'Status dos Carros',
      href: '/car-status',
      icon: Wrench,
      current: location.pathname === '/car-status'
    },
    {
      name: 'Finalizar Viagem',
      href: '/finalizar-viagem',
      icon: CheckCircle,
      current: location.pathname === '/finalizar-viagem'
    },
    {
      name: 'Status',
      href: '/status',
      icon: FileText,
      current: location.pathname === '/status'
    },
    {
      name: 'Informações dos Veículos',
      href: '/vehicles',
      icon: Info,
      current: location.pathname === '/vehicles'
    },
    {
      name: 'Admin',
      href: '/admin',
      icon: Users,
      current: location.pathname === '/admin'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Car className="h-8 w-8 text-blue-600" />
              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  Reservas de Carros
                </h1>
                <p className="text-sm text-gray-500">Bello Alimentos</p>
              </div>
            </div>
            
            {/* Navigation */}
            <nav className="hidden md:flex space-x-1">
              {navigation.map((item) => {
                const Icon = item.icon;
                return (
                  <Link key={item.name} to={item.href}>
                    <Button
                      variant={item.current ? 'default' : 'ghost'}
                      className={cn(
                        'flex items-center space-x-2 px-3 py-2',
                        item.current
                          ? 'bg-blue-600 text-white hover:bg-blue-700'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{item.name}</span>
                    </Button>
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      </header>

      {/* Mobile Navigation */}
      <nav className="md:hidden bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-1 py-2 overflow-x-auto">
            {navigation.map((item) => {
              const Icon = item.icon;
              return (
                <Link key={item.name} to={item.href} className="flex-shrink-0">
                  <Button
                    variant={item.current ? 'default' : 'ghost'}
                    size="sm"
                    className={cn(
                      'flex items-center space-x-1 px-2 py-1 text-xs',
                      item.current
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-600'
                    )}
                  >
                    <Icon className="h-3 w-3" />
                    <span>{item.name}</span>
                  </Button>
                </Link>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {title && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
          </div>
        )}
        {children}
      </main>
    </div>
  );
};

export default Layout;