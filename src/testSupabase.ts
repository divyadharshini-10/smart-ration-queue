
import { supabase } from "./supabase";

async function testConnection() {
  const { data, error } = await supabase
    .from("shops")
    .select("shop_code, name, village");

  if (error) {
    console.error("Supabase error:", error.message);
    return;
  }

  console.log("Connected successfully!");
  console.table(data);
}

testConnection();
