import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST() {
  try {
    const supabase = await createClient();
    await supabase.auth.signOut();
  } catch (error) {
    console.error("Error al cerrar sesión en Supabase:", error);
  }

  return NextResponse.json(
    { success: true, message: "Sesión cerrada correctamente" },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    }
  );
}

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    await supabase.auth.signOut();
  } catch (error) {
    console.error("Error al cerrar sesión en Supabase:", error);
  }

  return NextResponse.redirect(new URL("/login", req.url));
}
