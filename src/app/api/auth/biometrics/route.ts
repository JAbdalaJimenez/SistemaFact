import { NextResponse } from "next/server";

/**
 * Endpoint biométrico deshabilitado (sin almacenamiento en memoria ni cuentas hardcodeadas).
 * Se elimina por completo en la Fase 2.
 */
export async function POST() {
  return NextResponse.json(
    { error: "La autenticación biométrica sin verificación criptográfica ha sido deshabilitada." },
    { status: 410 }
  );
}
