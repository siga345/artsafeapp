import { redirect } from "next/navigation";

/**
 * Корневая страница приложения.
 * Перенаправляет на /today (домашний экран артиста).
 */
export default function Home(){
  redirect("/today");
}