import { HeartHandshake, Info, Mail, ReceiptText } from "lucide-react";
import { APP_INFO, formatBuildDate } from "@/lib/appInfo";

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="text-center">
        <div className="mb-4 flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Info className="h-8 w-8 text-primary" />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-foreground">Sobre o App</h1>
        <p className="mt-2 text-muted-foreground">
          Informações de versão, suporte e uso do Carpool Betel.
        </p>
      </div>

      <section className="rounded-xl border border-border bg-card p-5 shadow-card">
        <h2 className="mb-3 text-base font-semibold text-foreground">Versão</h2>
        <div className="space-y-2 text-sm text-muted-foreground">
          <p>
            <span className="font-medium text-foreground">Aplicativo:</span> {APP_INFO.name}
          </p>
          <p>
            <span className="font-medium text-foreground">Versão:</span> v{APP_INFO.version}
          </p>
          <p>
            <span className="font-medium text-foreground">Commit:</span> {APP_INFO.commit}
          </p>
          <p>
            <span className="font-medium text-foreground">Build:</span> {formatBuildDate(APP_INFO.buildDate)}
          </p>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-5 shadow-card">
        <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-foreground">
          <Mail className="h-4 w-4 text-primary" />
          Suporte
        </h2>
        <p className="text-sm text-muted-foreground">
          Se quiser reclamar, sugerir alguma coisa ou pedir uma ajuda, é só mandar um e-mail para {" "}
          <a className="font-medium text-primary underline underline-offset-4" href="mailto:estevamp@gmail.com">
            estevamp@gmail.com
          </a>
          .
        </p>
      </section>

      <section className="rounded-xl border border-border bg-card p-5 shadow-card">
        <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-foreground">
          <ReceiptText className="h-4 w-4 text-primary" />
          Aviso de Uso
        </h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Esse aplicativo foi desenvolvido apenas para uso da família de Betel. Não deve ser usado para outros
          fins.
        </p>
      </section>

      <section className="rounded-xl border border-border bg-card p-5 shadow-card">
        <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-foreground">
          <HeartHandshake className="h-4 w-4 text-primary" />
          Doações
        </h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          A manutenção e desenvolvimento gera alguns custos. Se vocêquiser me pagar um café, fique à vontade pra fazer um PIX para{" "}
          <span className="font-medium text-foreground">estevamp@gmail.com</span> ;-).
        </p>
      </section>
    </div>
  );
}
