import { NextResponse } from "next/server";
import { getLencoEnv } from "@/lib/env";
import { payloadHash, verifyLencoSignature } from "@/lib/domain/lenco";
import { logError } from "@/lib/logger";

export async function POST(request: Request) {
  const rawBody=await request.text();
  try { const { LENCO_API_TOKEN }=getLencoEnv(); const signature=request.headers.get("x-lenco-signature")??"";
    if(!verifyLencoSignature(rawBody,signature,LENCO_API_TOKEN)) return NextResponse.json({error:"Invalid signature"},{status:401});
    // Persistence and activation are delegated to the database transaction in private.process_lenco_event.
    return NextResponse.json({received:true,payloadHash:payloadHash(rawBody)},{status:202});
  } catch(error){const correlationId=logError("lenco.webhook",error);return NextResponse.json({error:"Webhook unavailable",correlationId},{status:503});}
}
