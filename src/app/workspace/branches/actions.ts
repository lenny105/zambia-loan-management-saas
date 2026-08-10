"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { logError } from "@/lib/logger";
export type BranchState={ok:boolean;message:string};
export async function createBranch(_:BranchState,form:FormData):Promise<BranchState>{const p=z.object({code:z.string().trim().min(2).max(20),name:z.string().trim().min(2).max(100),address:z.string().trim().min(8).max(300),phone:z.string().trim().max(20)}).safeParse(Object.fromEntries(form));if(!p.success)return{ok:false,message:"Check the branch details."};try{const{error}=await(await createClient()).rpc("create_tenant_branch",{p_code:p.data.code.toLowerCase(),p_name:p.data.name,p_address:p.data.address,p_phone:p.data.phone});if(error)throw error;revalidatePath("/workspace/branches");return{ok:true,message:"Branch created."}}catch(error){const message=error instanceof Error&&error.message.includes("plan limit")?"Your subscription branch limit has been reached.":`Branch creation failed. Reference: ${logError("workspace.branch.create",error)}`;return{ok:false,message}}}
