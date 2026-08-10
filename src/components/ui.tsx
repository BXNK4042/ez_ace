import type { ButtonHTMLAttributes, HTMLAttributes, InputHTMLAttributes } from "react";

export function Button({ className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button className={`button ${className}`} {...props} />;
}
export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input className="input" {...props} />;
}
export function Card(props: HTMLAttributes<HTMLDivElement>) {
  return <div {...props} className={`card ${props.className ?? ""}`} />;
}
