'use client';
import { ReactNode } from "react";
import { Props } from "../app/moodboard/[moodboardId]/page";

export function RoundContainer({ children }: Props) {
  return <div className="bg-white hover:bg-slate-200 justify-center align-middle m-4 rounded-full shadow-md border border-gray-500">{children}</div>;
}
interface Props {
  children?: ReactNode
}