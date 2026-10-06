export type ButtonVariant = "solid" | "outline";
export type ButtonSize = "md" | "sm";

const base =
  "group inline-flex items-center gap-2 rounded-full font-medium tracking-[-0.01em] transition-[transform,box-shadow,background-color,border-color,color] duration-300 ease-out active:translate-y-0 active:scale-[0.98]";

const variants: Record<ButtonVariant, string> = {
  solid:
    "bg-[linear-gradient(180deg,#eac57c_0%,#d9a54d_55%,#c9933c_100%)] text-pyxis-bg shadow-[0_0_0_1px_rgba(217,165,77,0.35),0_10px_30px_-10px_rgba(217,165,77,0.55)] hover:-translate-y-0.5 hover:shadow-[0_0_0_1px_rgba(234,197,124,0.6),0_16px_40px_-10px_rgba(217,165,77,0.75)]",
  outline:
    "border border-pyxis-accent/35 text-pyxis-fg/90 hover:border-pyxis-accent hover:bg-pyxis-accent/10 hover:text-pyxis-accent-soft",
};

const sizes: Record<ButtonSize, string> = {
  md: "px-6 py-3 text-sm",
  sm: "px-4 py-2 text-[13px]",
};

export function buttonClasses(variant: ButtonVariant, size: ButtonSize, extra = "") {
  return `${base} ${variants[variant]} ${sizes[size]} ${extra}`.trim();
}
