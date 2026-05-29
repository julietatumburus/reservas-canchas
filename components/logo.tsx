import Link from "next/link";
import { Ball } from "@/components/ball";

export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="group flex items-center gap-2.5">
      <Ball className="h-8 w-8 shadow-md transition-transform duration-300 group-hover:rotate-[20deg]" />
      <span className="text-lg font-semibold tracking-tight text-white">
        Saque
      </span>
    </Link>
  );
}
