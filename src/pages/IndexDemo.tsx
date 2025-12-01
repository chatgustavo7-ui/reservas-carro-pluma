import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Car, Calendar, AlertCircle, CheckCircle2 } from "lucide-react";

const IndexDemo = () => {
  // Dados mock apenas para visualização
  const mockCars = [
    { id: 1, model: "Fiat Argo", plate: "ABC-1234", status: "disponível", km: 45800 },
    { id: 2, model: "Chevrolet Onix", plate: "DEF-5678", status: "reservado", km: 60500 },
    { id: 3, model: "Volkswagen Gol", plate: "GHI-9012", status: "disponível", km: 32100 },
    { id: 4, model: "Hyundai HB20", plate: "JKL-3456", status: "disponível", km: 28900 },
  ];

  const mockReservations = [
    { id: 1, car: "ABC-1234", driver: "João Silva", date: "15/12/2025", destination: "São Paulo" },
    { id: 2, car: "DEF-5678", driver: "Maria Santos", date: "16/12/2025", destination: "Rio de Janeiro" },
  ];

  const mockAlerts = [
    { id: 1, type: "critical", message: "Chevrolet Onix - Revisão vencida (500km)" },
    { id: 2, type: "warning", message: "Fiat Argo - Revisão próxima em 200km" },
    { id: 3, type: "info", message: "VW Gol - Parado há 35 dias" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      {/* Hero Section */}
      <div className="relative bg-gradient-to-r from-primary/90 to-primary/70 text-primary-foreground py-16 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <Car className="h-12 w-12" />
            <h1 className="text-5xl font-bold">Sistema de Reservas</h1>
          </div>
          <p className="text-xl opacity-90 max-w-2xl">
            Gerenciamento inteligente de veículos corporativos
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-12 space-y-8">
        {/* Status Cards */}
        <div className="grid md:grid-cols-4 gap-6">
          <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 border-green-200">
            <CardHeader>
              <CardTitle className="text-green-700 dark:text-green-300 flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5" />
                Disponíveis
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-green-700 dark:text-green-300">3</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 border-blue-200">
            <CardHeader>
              <CardTitle className="text-blue-700 dark:text-blue-300 flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Reservados
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-blue-700 dark:text-blue-300">1</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950 dark:to-amber-900 border-amber-200">
            <CardHeader>
              <CardTitle className="text-amber-700 dark:text-amber-300 flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                Alertas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-amber-700 dark:text-amber-300">3</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-700 border-slate-200">
            <CardHeader>
              <CardTitle className="text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <Car className="h-5 w-5" />
                Total
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-slate-700 dark:text-slate-300">4</div>
            </CardContent>
          </Card>
        </div>

        {/* Alertas */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Alertas de Manutenção
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {mockAlerts.map((alert) => (
              <div
                key={alert.id}
                className={`flex items-center justify-between p-4 rounded-lg ${
                  alert.type === 'critical'
                    ? 'bg-red-50 dark:bg-red-950 border border-red-200'
                    : alert.type === 'warning'
                    ? 'bg-amber-50 dark:bg-amber-950 border border-amber-200'
                    : 'bg-blue-50 dark:bg-blue-950 border border-blue-200'
                }`}
              >
                <span className="text-sm font-medium">{alert.message}</span>
                <Badge
                  variant={
                    alert.type === 'critical'
                      ? 'destructive'
                      : alert.type === 'warning'
                      ? 'default'
                      : 'secondary'
                  }
                >
                  {alert.type === 'critical'
                    ? 'Crítico'
                    : alert.type === 'warning'
                    ? 'Atenção'
                    : 'Info'}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Veículos */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Car className="h-5 w-5" />
                Veículos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {mockCars.map((car) => (
                  <div
                    key={car.id}
                    className="flex items-center justify-between p-4 bg-secondary rounded-lg"
                  >
                    <div>
                      <div className="font-semibold">{car.model}</div>
                      <div className="text-sm text-muted-foreground">{car.plate}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {car.km.toLocaleString()} km
                      </div>
                    </div>
                    <Badge
                      variant={car.status === "disponível" ? "default" : "secondary"}
                    >
                      {car.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Reservas */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Próximas Reservas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {mockReservations.map((reservation) => (
                  <div
                    key={reservation.id}
                    className="flex items-center justify-between p-4 bg-secondary rounded-lg"
                  >
                    <div>
                      <div className="font-semibold">{reservation.driver}</div>
                      <div className="text-sm text-muted-foreground">
                        {reservation.car} → {reservation.destination}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {reservation.date}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <Button className="w-full mt-4" variant="outline">
                Nova Reserva
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Info Banner */}
        <Card className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950 border-blue-200">
          <CardContent className="pt-6">
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-2">Frontend de Demonstração</h3>
              <p className="text-sm text-muted-foreground">
                Esta é uma versão visual do sistema sem conexão ao banco de dados.
                Todos os dados exibidos são simulados para demonstração da interface.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default IndexDemo;
