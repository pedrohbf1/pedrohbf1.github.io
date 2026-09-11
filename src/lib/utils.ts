// O CLI do shadcn passou a gerar componentes importando de "cn" (substituto
// compilado de clsx + tailwind-merge). Reexportamos daqui para que os dois
// caminhos de import apontem para a MESMA implementação de merge.
export { cn } from "cn";
