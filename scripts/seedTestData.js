import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://chjvnnrsmlxetuxmgjlc.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNoanZubnJzbWx4ZXR1eG1namxjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA4MTg2MTUsImV4cCI6MjA4NjM5NDYxNX0.xZ9a7Wu4zznxdQVu_wceanzkUsyH56E3Mq85_ZYC69k";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function seedTestData() {
  console.log("🌱 Seeding test data...\n");

  // Test items to create
  const testItems = [
    {
      type: "text",
      x: 100,
      y: 100,
      width: 200,
      height: 60,
      content: "Welcome to Omnispace! 🚀",
      file_name: null,
    },
    {
      type: "text",
      x: 400,
      y: 150,
      width: 220,
      height: 80,
      content:
        "This is a test text note.\nYou can create these by double-clicking!",
      file_name: null,
    },
    {
      type: "rectangle",
      x: 50,
      y: 300,
      width: 500,
      height: 300,
      content: "",
      file_name: null,
    },
    {
      type: "text",
      x: 150,
      y: 400,
      width: 200,
      height: 60,
      content: "Pan with Space + Drag",
      file_name: null,
    },
    {
      type: "text",
      x: 150,
      y: 500,
      width: 200,
      height: 60,
      content: "Zoom with Scroll Wheel",
      file_name: null,
    },
  ];

  try {
    // Insert test items
    const { data, error } = await supabase
      .from("items")
      .insert(testItems)
      .select();

    if (error) {
      console.error("❌ Error inserting data:", error.message);

      if (error.message.includes('relation "items" does not exist')) {
        console.log('\n⚠️  The "items" table does not exist yet!');
        console.log("📋 Creating table...\n");
        await createItemsTable();

        // Retry insertion
        const { data: retryData, error: retryError } = await supabase
          .from("items")
          .insert(testItems)
          .select();

        if (retryError) {
          console.error("❌ Error after creating table:", retryError.message);
          return;
        }

        console.log(`✅ Successfully inserted ${retryData.length} test items!`);
        console.log("📊 Test items:", retryData);
      }
    } else {
      console.log(`✅ Successfully inserted ${data.length} test items!`);
      console.log("📊 Test items:");
      data.forEach((item, i) => {
        console.log(`   ${i + 1}. [${item.type}] at (${item.x}, ${item.y})`);
      });
    }

    console.log("\n🎉 Done! Refresh your app to see the items.");
  } catch (err) {
    console.error("❌ Unexpected error:", err);
  }
}

async function createItemsTable() {
  // Note: This requires database permissions
  // If this fails, you'll need to create the table manually in Supabase dashboard

  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS items (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      type TEXT NOT NULL,
      x FLOAT NOT NULL,
      y FLOAT NOT NULL,
      width FLOAT NOT NULL,
      height FLOAT NOT NULL,
      content TEXT,
      file_name TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `;

  try {
    const { error } = await supabase.rpc("exec_sql", { sql: createTableSQL });

    if (error) {
      console.error("❌ Could not create table automatically:", error.message);
      console.log(
        "\n📝 Please create the table manually in Supabase dashboard:",
      );
      console.log("   1. Go to https://supabase.com/dashboard");
      console.log("   2. Select your project");
      console.log("   3. Go to SQL Editor");
      console.log("   4. Run this SQL:\n");
      console.log(createTableSQL);
      return false;
    }

    console.log("✅ Table created successfully!");
    return true;
  } catch (err) {
    console.error("❌ Table creation failed:", err.message);
    console.log("\n📝 Please create the table manually in Supabase dashboard.");
    return false;
  }
}

// Run the seeding
seedTestData();
