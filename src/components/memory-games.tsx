import { Eye, LayoutGrid, ShoppingBasket } from "lucide-react";
import { imageSrc } from "@/lib/library";

export type Game = "paires" | "disparu" | "courses";
/** Each game shows what it looks like: a few of its own pictures, plus an emoji and a colour of its own. */
export const GAMES: { id: Game; title: string; emoji: string; text: string; Icon: typeof Eye; preview: string[]; tone: string }[] = [
  { id: "paires", title: "Les paires", emoji: "🃏", text: "Retournez deux cartes et retrouvez les images identiques.", Icon: LayoutGrid, preview: ["keys", "?", "keys"], tone: "bg-u-retrouver-soft border-u-retrouver/40" },
  { id: "disparu", title: "L'objet disparu", emoji: "🔍", text: "Regardez quelques objets. L'un d'eux disparaît : lequel ?", Icon: Eye, preview: ["glasses", "umbrella", "?"], tone: "bg-u-comprendre-soft border-u-comprendre/40" },
  { id: "courses", title: "La liste de courses", emoji: "🛒", text: "Retenez trois produits, puis retrouvez-les parmi d'autres.", Icon: ShoppingBasket, preview: ["apple", "cheese", "bread"], tone: "bg-u-exprimer-soft border-u-exprimer/40" },
];

/** Three small pictures that show what the game is ("?" = a card face down). */
export function Preview({ ids, size = "size-16" }: { ids: string[]; size?: string }) {
  return (
    <span className="flex gap-2">
      {ids.map((id, k) =>
        id === "?" ? (
          <span key={k} className={`${size} grid place-items-center rounded-xl bg-primary/15 font-serif text-3xl text-primary/70`}>?</span>
        ) : (
          <img key={k} src={imageSrc(id) ?? ""} alt="" className={`${size} rounded-xl object-cover shadow-sm`} />
        ),
      )}
    </span>
  );
}

