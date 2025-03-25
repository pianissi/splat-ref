'use client';
import { ReactNode } from "react";

export function RoundContainer({ children, hoverable = false }: Props) {
  return <div className={`bg-white justify-center align-middle m-4 rounded-full shadow-sm border border-gray-300 shadow-gray-400 transition ${hoverable && 'hover:bg-slate-200 hover:shadow-md hover:shadow-gray-500'}`}>{children}</div>;
}
interface Props {
  children?: ReactNode,
  hoverable?: boolean
}