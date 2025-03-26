'use client';
import { ReactNode } from "react";
import { twMerge } from "tailwind-merge";
import {motion} from "motion/react";

export function RoundContainer({ children, className, hoverable = false }: Props) {
  return <motion.div layout="position" className={twMerge(`bg-white justify-center align-middle m-4 rounded-full shadow-sm border border-gray-300 shadow-gray-400 transition ${hoverable && 'hover:bg-slate-200 hover:shadow-md hover:shadow-gray-500'}`, className)}>{children}</motion.div>;
}
interface Props {
  children?: ReactNode,
  hoverable?: boolean,
  className?: string
}