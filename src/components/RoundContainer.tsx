'use client';
import { ReactNode } from "react";
import { Props } from "../app/moodboard/[moodboardId]/page";

export function RoundContainer({ children, hoverable = false }: Props) {
  return <div className={`bg-white justify-center align-middle m-4 rounded-full shadow-md border border-gray-500 ${hoverable && 'hover:bg-slate-200'}`}>{children}</div>;
}
interface Props {
  children?: ReactNode,
  hoverable?: boolean
}