import { About } from "@/components/about";
import { Contact } from "@/components/contact";
import { Footer } from "@/components/footer";
import { Hero } from "@/components/hero";
import { ProjectTimeline } from "@/components/project-timeline";
import { SiteHeader } from "@/components/site-header";
import { ThemeProvider } from "@/components/theme-provider";

function App() {
  return (
    <ThemeProvider defaultTheme="system">
      {/* O <main> separa conteúdo de moldura: navegação e rodapé ficam de
          fora. É isso que dá a um leitor de tela o "pular para o conteúdo" e
          ao buscador o corpo da página. O wrapper relativo é a âncora do
          cabeçalho, que é absoluto. */}
      <div className="relative">
        <SiteHeader />
        <main>
          <Hero />
          <ProjectTimeline />
          <About />
          <Contact />
        </main>
        <Footer />
      </div>
    </ThemeProvider>
  );
}

export default App;
