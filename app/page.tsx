"use client"

import { useState } from "react"
import { PlusCircle, Database, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { NewOrderModal } from "@/components/new-order-modal"
import { UpdateDatabaseModal } from "@/components/update-database-modal"
import { useRouter } from "next/navigation"
import { Toaster } from "@/components/ui/toaster"
import { useToast } from "@/components/ui/use-toast"

export default function Home() {
  const [newOrderOpen, setNewOrderOpen] = useState(false)
  const [updateDbOpen, setUpdateDbOpen] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  const handleOpenReports = () => {
    router.push("/relatorios")
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 md:p-24 bg-background">
      <div className="z-10 max-w-5xl w-full items-center justify-center text-center">
        <h1 className="text-4xl font-bold mb-8">Integrador Colheita Certa</h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="hover:shadow-lg transition-all">
            <CardHeader>
              <CardTitle className="flex justify-center">
                <PlusCircle className="h-8 w-8 mb-2 text-primary" />
              </CardTitle>
              <CardTitle>Novo Pedido</CardTitle>
              <CardDescription>Solicite um novo pedido de produtos</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Crie um novo pedido com produtos do catálogo atual.</p>
            </CardContent>
            <CardFooter className="flex justify-center">
              <Button onClick={() => setNewOrderOpen(true)}>Solicitar Pedido</Button>
            </CardFooter>
          </Card>

          <Card className="hover:shadow-lg transition-all">
            <CardHeader>
              <CardTitle className="flex justify-center">
                <Database className="h-8 w-8 mb-2 text-primary" />
              </CardTitle>
              <CardTitle>Atualizar Base</CardTitle>
              <CardDescription>Atualize a base de dados de produtos</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Adicione novos produtos ou atualize via planilha.</p>
            </CardContent>
            <CardFooter className="flex justify-center">
              <Button onClick={() => setUpdateDbOpen(true)}>Atualizar Base</Button>
            </CardFooter>
          </Card>

          <Card className="hover:shadow-lg transition-all">
            <CardHeader>
              <CardTitle className="flex justify-center">
                <FileText className="h-8 w-8 mb-2 text-primary" />
              </CardTitle>
              <CardTitle>Relatórios</CardTitle>
              <CardDescription>Visualize relatórios de pedidos</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Consulte e exporte relatórios de pedidos realizados.</p>
            </CardContent>
            <CardFooter className="flex justify-center">
              <Button onClick={handleOpenReports}>Ver Relatórios</Button>
            </CardFooter>
          </Card>
        </div>
      </div>

      <NewOrderModal open={newOrderOpen} onOpenChange={setNewOrderOpen} />
      <UpdateDatabaseModal open={updateDbOpen} onOpenChange={setUpdateDbOpen} />
      <Toaster />
    </main>
  )
}

