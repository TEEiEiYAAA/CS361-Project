// this is automate script to import predefined skills into DynamoDB Skills table
// run this script once to populate the table
// dont forget to set up Timeout in General configuration to 1 minute
import { DynamoDBClient, CreateTableCommand, DescribeTableCommand } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const TABLE_NAME = "Skills";

// ฟังก์ชันสำหรับรอให้ตารางสร้างเสร็จ (Polling)
const waitForTableActive = async () => {
  console.log("⏳ Waiting for table to become ACTIVE...");
  let retries = 0;
  while (retries < 20) { // รอประมาณ 40 วินาที
    try {
      const { Table } = await client.send(new DescribeTableCommand({ TableName: TABLE_NAME }));
      if (Table.TableStatus === "ACTIVE") {
        console.log("✅ Table is ACTIVE!");
        return true;
      }
    } catch (e) {
      // Ignore error while checking
    }
    await new Promise(resolve => setTimeout(resolve, 2000)); // รอ 2 วินาทีแล้วเช็คใหม่
    retries++;
  }
  throw new Error("Table creation timed out.");
};

export const handler = async (event) => {
  // 1. ตรวจสอบและสร้างตาราง
  try {
    await client.send(new DescribeTableCommand({ TableName: TABLE_NAME }));
    console.log(`ℹ️ Table "${TABLE_NAME}" already exists. Skipping creation.`);
  } catch (err) {
    if (err.name === 'ResourceNotFoundException') {
      console.log(`⚠️ Table "${TABLE_NAME}" not found. Creating new table...`);
      
      await client.send(new CreateTableCommand({
        TableName: TABLE_NAME,
        KeySchema: [{ AttributeName: "skillId", KeyType: "HASH" }], // Partition Key
        AttributeDefinitions: [{ AttributeName: "skillId", AttributeType: "S" }],
        BillingMode: "PAY_PER_REQUEST" // ใช้แบบ On-demand (ประหยัด)
      }));

      // รอให้ตารางสถานะเป็น ACTIVE ก่อนจะยัดข้อมูล
      await waitForTableActive();
    } else {
      throw err; // ถ้าเป็น Error อื่นให้โยนออกมา
    }
  }

  // 2. เตรียมข้อมูลทั้งหมด (รวมทุก PLO)
  const allSkillsData = [
    // ==========================================
    // 🟢 PLO1: พื้นฐาน (Programming & CS)
    // ==========================================
    { "skillId": "sk-c-easy", "skillGroupId": "grp-c", "skillGroupName": "C Programming", "skillLevel": "Easy", "name": "C (ระดับง่าย)", "description": "เข้าใจ Syntax พื้นฐาน, Variable Types และ Control Flow", "PLO": "PLO1", "category": "hard skill", "subcategory": "Programming", "yearLevel": 1, "isRequired": true, "passingScore": 60 },
    { "skillId": "sk-c-med", "skillGroupId": "grp-c", "skillGroupName": "C Programming", "skillLevel": "Medium", "name": "C (ระดับกลาง)", "description": "ใช้งาน Pointers, Memory Management และ Struct ได้", "PLO": "PLO1", "category": "hard skill", "subcategory": "Programming", "yearLevel": 2, "isRequired": true, "passingScore": 70 },
    { "skillId": "sk-c-hard", "skillGroupId": "grp-c", "skillGroupName": "C Programming", "skillLevel": "Hard", "name": "C (ระดับยาก)", "description": "เข้าใจ System Programming, File I/O ขั้นสูง และ Optimization", "PLO": "PLO1", "category": "hard skill", "subcategory": "Programming", "yearLevel": 3, "isRequired": true, "passingScore": 80 },

    { "skillId": "sk-js-easy", "skillGroupId": "grp-js", "skillGroupName": "JavaScript", "skillLevel": "Easy", "name": "JS (ระดับง่าย)", "description": "เข้าใจ DOM Manipulation, Events และ Syntax พื้นฐาน", "PLO": "PLO1", "category": "hard skill", "subcategory": "Programming", "yearLevel": 1, "isRequired": true, "passingScore": 60 },
    { "skillId": "sk-js-med", "skillGroupId": "grp-js", "skillGroupName": "JavaScript", "skillLevel": "Medium", "name": "JS (ระดับกลาง)", "description": "ใช้งาน Async/Await, ES6+ Features และ Fetch API ได้", "PLO": "PLO1", "category": "hard skill", "subcategory": "Programming", "yearLevel": 2, "isRequired": true, "passingScore": 70 },
    { "skillId": "sk-js-hard", "skillGroupId": "grp-js", "skillGroupName": "JavaScript", "skillLevel": "Hard", "name": "JS (ระดับยาก)", "description": "เข้าใจ JS Frameworks (React/Vue/Node) และ Performance Tuning", "PLO": "PLO1", "category": "hard skill", "subcategory": "Programming", "yearLevel": 3, "isRequired": true, "passingScore": 80 },

    { "skillId": "sk-python-easy", "skillGroupId": "grp-python", "skillGroupName": "Python Programming", "skillLevel": "Easy", "name": "Python (ระดับง่าย)", "description": "เขียน Syntax พื้นฐาน, ตัวแปร, Loop และ Condition ได้ถูกต้อง", "PLO": "PLO1", "category": "hard skill", "subcategory": "Programming", "yearLevel": 1, "isRequired": true, "passingScore": 60 },
    { "skillId": "sk-python-med", "skillGroupId": "grp-python", "skillGroupName": "Python Programming", "skillLevel": "Medium", "name": "Python (ระดับกลาง)", "description": "ใช้งาน Function, Modules และจัดการ File/Error Handling ได้", "PLO": "PLO1", "category": "hard skill", "subcategory": "Programming", "yearLevel": 2, "isRequired": true, "passingScore": 70 },
    { "skillId": "sk-python-hard", "skillGroupId": "grp-python", "skillGroupName": "Python Programming", "skillLevel": "Hard", "name": "Python (ระดับยาก)", "description": "เข้าใจ OOP, Decorators และประยุกต์ใช้กับงาน Data Science หรือ Web ได้", "PLO": "PLO1", "category": "hard skill", "subcategory": "Programming", "yearLevel": 3, "isRequired": true, "passingScore": 80 },
    
    { "skillId": "sk-os-easy", "skillGroupId": "grp-os", "skillGroupName": "Operating Systems", "skillLevel": "Easy", "name": "OS (ระดับง่าย)", "description": "เข้าใจแนวคิด Process vs Thread และ Scheduling พื้นฐาน", "PLO": "PLO1", "category": "hard skill", "subcategory": "Computer Science", "yearLevel": 2, "isRequired": true, "passingScore": 60 },
    { "skillId": "sk-os-med", "skillGroupId": "grp-os", "skillGroupName": "Operating Systems", "skillLevel": "Medium", "name": "OS (ระดับกลาง)", "description": "เข้าใจเรื่อง Deadlock, Concurrency และ Memory Management", "PLO": "PLO1", "category": "hard skill", "subcategory": "Computer Science", "yearLevel": 3, "isRequired": true, "passingScore": 70 },
    { "skillId": "sk-os-hard", "skillGroupId": "grp-os", "skillGroupName": "Operating Systems", "skillLevel": "Hard", "name": "OS (ระดับยาก)", "description": "เข้าใจการทำงานของ Kernel, File Systems และ Virtualization Concepts", "PLO": "PLO1", "category": "hard skill", "subcategory": "Computer Science", "yearLevel": 3, "isRequired": true, "passingScore": 80 },

    { "skillId": "sk-dsa-easy", "skillGroupId": "grp-dsa", "skillGroupName": "Data Structures & Algorithms", "skillLevel": "Easy", "name": "DSA (ระดับง่าย)", "description": "เข้าใจโครงสร้าง Array, Linked List, Stack และ Queue", "PLO": "PLO1", "category": "hard skill", "subcategory": "Computer Science", "yearLevel": 1, "isRequired": true, "passingScore": 60 },
    { "skillId": "sk-dsa-med", "skillGroupId": "grp-dsa", "skillGroupName": "Data Structures & Algorithms", "skillLevel": "Medium", "name": "DSA (ระดับกลาง)", "description": "เข้าใจโครงสร้าง Tree, Graph และ Sorting Algorithms พื้นฐาน", "PLO": "PLO1", "category": "hard skill", "subcategory": "Computer Science", "yearLevel": 2, "isRequired": true, "passingScore": 70 },
    { "skillId": "sk-dsa-hard", "skillGroupId": "grp-dsa", "skillGroupName": "Data Structures & Algorithms", "skillLevel": "Hard", "name": "DSA (ระดับยาก)", "description": "วิเคราะห์ Time Complexity (Big O) และประยุกต์ใช้แก้โจทย์ซับซ้อนได้", "PLO": "PLO1", "category": "hard skill", "subcategory": "Computer Science", "yearLevel": 3, "isRequired": true, "passingScore": 80 },

    // ==========================================
    // 🔵 PLO2: ระบบ (SE, Infra, Cloud, AI/Data)
    // ==========================================
    { "skillId": "sk-req-easy", "skillGroupId": "grp-req", "skillGroupName": "Requirement Engineering", "skillLevel": "Easy", "name": "Req (ระดับง่าย)", "description": "เขียน User Stories และแยกแยะ Functional/Non-functional Req ได้", "PLO": "PLO2", "category": "hard skill", "subcategory": "Software Engineering", "yearLevel": 2, "isRequired": true, "passingScore": 60 },
    { "skillId": "sk-req-med", "skillGroupId": "grp-req", "skillGroupName": "Requirement Engineering", "skillLevel": "Medium", "name": "Req (ระดับกลาง)", "description": "จัดทำ SRS Documentation และเขียน Use Case Diagram ได้", "PLO": "PLO2", "category": "hard skill", "subcategory": "Software Engineering", "yearLevel": 3, "isRequired": true, "passingScore": 70 },
    { "skillId": "sk-req-hard", "skillGroupId": "grp-req", "skillGroupName": "Requirement Engineering", "skillLevel": "Hard", "name": "Req (ระดับยาก)", "description": "วิเคราะห์และตรวจสอบความถูกต้องของ Requirement (Analysis & Validation)", "PLO": "PLO2", "category": "hard skill", "subcategory": "Software Engineering", "yearLevel": 4, "isRequired": true, "passingScore": 80 },

    { "skillId": "sk-test-easy", "skillGroupId": "grp-test", "skillGroupName": "Software Testing", "skillLevel": "Easy", "name": "Testing (ระดับง่าย)", "description": "เข้าใจ Manual Testing และออกแบบ Test Case พื้นฐานได้", "PLO": "PLO2", "category": "hard skill", "subcategory": "Software Engineering", "yearLevel": 2, "isRequired": true, "passingScore": 60 },
    { "skillId": "sk-test-med", "skillGroupId": "grp-test", "skillGroupName": "Software Testing", "skillLevel": "Medium", "name": "Testing (ระดับกลาง)", "description": "ทำ Unit Testing (เช่น Jest/JUnit) และ Automation เบื้องต้นได้", "PLO": "PLO2", "category": "hard skill", "subcategory": "Software Engineering", "yearLevel": 3, "isRequired": true, "passingScore": 70 },
    { "skillId": "sk-test-hard", "skillGroupId": "grp-test", "skillGroupName": "Software Testing", "skillLevel": "Hard", "name": "Testing (ระดับยาก)", "description": "ทำ Performance/Load Testing และเข้าใจระบบ CI/CD Integration", "PLO": "PLO2", "category": "hard skill", "subcategory": "Software Engineering", "yearLevel": 4, "isRequired": true, "passingScore": 80 },

    { "skillId": "sk-net-easy", "skillGroupId": "grp-net", "skillGroupName": "Computer Network", "skillLevel": "Easy", "name": "Network (ระดับง่าย)", "description": "เข้าใจ IP Address, Subnetting และ OSI Model", "PLO": "PLO2", "category": "hard skill", "subcategory": "Infrastructure", "yearLevel": 2, "isRequired": true, "passingScore": 60 },
    { "skillId": "sk-net-med", "skillGroupId": "grp-net", "skillGroupName": "Computer Network", "skillLevel": "Medium", "name": "Network (ระดับกลาง)", "description": "เข้าใจการทำงานของ Routing, Switching และ VLAN", "PLO": "PLO2", "category": "hard skill", "subcategory": "Infrastructure", "yearLevel": 3, "isRequired": true, "passingScore": 70 },
    { "skillId": "sk-net-hard", "skillGroupId": "grp-net", "skillGroupName": "Computer Network", "skillLevel": "Hard", "name": "Network (ระดับยาก)", "description": "เข้าใจ Network Security, VPN และ Load Balancing", "PLO": "PLO2", "category": "hard skill", "subcategory": "Infrastructure", "yearLevel": 4, "isRequired": true, "passingScore": 80 },

    { "skillId": "sk-linux-easy", "skillGroupId": "grp-linux", "skillGroupName": "Linux Command Line", "skillLevel": "Easy", "name": "Linux (ระดับง่าย)", "description": "ใช้งานคำสั่งพื้นฐาน (ls, cd, mkdir) และจัดการ Permissions ได้", "PLO": "PLO2", "category": "hard skill", "subcategory": "Infrastructure", "yearLevel": 2, "isRequired": true, "passingScore": 60 },
    { "skillId": "sk-linux-med", "skillGroupId": "grp-linux", "skillGroupName": "Linux Command Line", "skillLevel": "Medium", "name": "Linux (ระดับกลาง)", "description": "เขียน Shell Scripting และจัดการ User/Process ได้", "PLO": "PLO2", "category": "hard skill", "subcategory": "Infrastructure", "yearLevel": 3, "isRequired": true, "passingScore": 70 },
    { "skillId": "sk-linux-hard", "skillGroupId": "grp-linux", "skillGroupName": "Linux Command Line", "skillLevel": "Hard", "name": "Linux (ระดับยาก)", "description": "ติดตั้งและตั้งค่า Server (Nginx/Apache) และทำ System Monitoring", "PLO": "PLO2", "category": "hard skill", "subcategory": "Infrastructure", "yearLevel": 4, "isRequired": true, "passingScore": 80 },

    { "skillId": "sk-virt-easy", "skillGroupId": "grp-virt", "skillGroupName": "Virtualization", "skillLevel": "Easy", "name": "Virtualization (ง่าย)", "description": "เข้าใจคอนเซปต์ VM และใช้งาน VirtualBox/VMware พื้นฐาน", "PLO": "PLO2", "category": "hard skill", "subcategory": "Cloud & Infra", "yearLevel": 2, "isRequired": true, "passingScore": 60 },
    { "skillId": "sk-virt-med", "skillGroupId": "grp-virt", "skillGroupName": "Virtualization", "skillLevel": "Medium", "name": "Virtualization (กลาง)", "description": "เข้าใจ Containerization และเริ่มใช้งาน Docker ได้", "PLO": "PLO2", "category": "hard skill", "subcategory": "Cloud & Infra", "yearLevel": 3, "isRequired": true, "passingScore": 70 },
    { "skillId": "sk-virt-hard", "skillGroupId": "grp-virt", "skillGroupName": "Virtualization", "skillLevel": "Hard", "name": "Virtualization (ยาก)", "description": "เข้าใจ Orchestration และพื้นฐาน Kubernetes", "PLO": "PLO2", "category": "hard skill", "subcategory": "Cloud & Infra", "yearLevel": 4, "isRequired": true, "passingScore": 80 },

    { "skillId": "sk-cloud-easy", "skillGroupId": "grp-cloud", "skillGroupName": "Cloud Computing", "skillLevel": "Easy", "name": "Cloud (ระดับง่าย)", "description": "เข้าใจ Cloud Concepts (IaaS/PaaS/SaaS) และ AWS/Azure พื้นฐาน", "PLO": "PLO2", "category": "hard skill", "subcategory": "Cloud & Infra", "yearLevel": 3, "isRequired": true, "passingScore": 60 },
    { "skillId": "sk-cloud-med", "skillGroupId": "grp-cloud", "skillGroupName": "Cloud Computing", "skillLevel": "Medium", "name": "Cloud (ระดับกลาง)", "description": "สามารถ Deploy App ขึ้น Cloud และจัดการ S3/EC2 ได้", "PLO": "PLO2", "category": "hard skill", "subcategory": "Cloud & Infra", "yearLevel": 3, "isRequired": true, "passingScore": 70 },
    { "skillId": "sk-cloud-hard", "skillGroupId": "grp-cloud", "skillGroupName": "Cloud Computing", "skillLevel": "Hard", "name": "Cloud (ระดับยาก)", "description": "เข้าใจ Serverless Architecture และ Auto-scaling", "PLO": "PLO2", "category": "hard skill", "subcategory": "Cloud & Infra", "yearLevel": 4, "isRequired": true, "passingScore": 80 },

    { "skillId": "sk-carch-easy", "skillGroupId": "grp-carch", "skillGroupName": "Cloud Architecture", "skillLevel": "Easy", "name": "Cloud Arch (ง่าย)", "description": "เข้าใจการออกแบบสถาปัตยกรรมเบื้องต้น (Monolith on Cloud)", "PLO": "PLO2", "category": "hard skill", "subcategory": "Cloud & Infra", "yearLevel": 3, "isRequired": true, "passingScore": 60 },
    { "skillId": "sk-carch-med", "skillGroupId": "grp-carch", "skillGroupName": "Cloud Architecture", "skillLevel": "Medium", "name": "Cloud Arch (กลาง)", "description": "เข้าใจ Microservices Architecture และ Database Scaling", "PLO": "PLO2", "category": "hard skill", "subcategory": "Cloud & Infra", "yearLevel": 4, "isRequired": true, "passingScore": 70 },
    { "skillId": "sk-carch-hard", "skillGroupId": "grp-carch", "skillGroupName": "Cloud Architecture", "skillLevel": "Hard", "name": "Cloud Arch (ยาก)", "description": "ออกแบบระบบ Multi-region, High Availability และ Disaster Recovery", "PLO": "PLO2", "category": "hard skill", "subcategory": "Cloud & Infra", "yearLevel": 4, "isRequired": true, "passingScore": 80 },

    { "skillId": "sk-sec-easy", "skillGroupId": "grp-sec", "skillGroupName": "Cybersecurity", "skillLevel": "Easy", "name": "Security (ระดับง่าย)", "description": "เข้าใจ Password Security และมีความตระหนักเรื่อง Phishing", "PLO": "PLO2", "category": "hard skill", "subcategory": "Security", "yearLevel": 2, "isRequired": true, "passingScore": 60 },
    { "skillId": "sk-sec-med", "skillGroupId": "grp-sec", "skillGroupName": "Cybersecurity", "skillLevel": "Medium", "name": "Security (ระดับกลาง)", "description": "เข้าใจ OWASP Top 10 และพื้นฐาน Pen-testing", "PLO": "PLO2", "category": "hard skill", "subcategory": "Security", "yearLevel": 3, "isRequired": true, "passingScore": 70 },
    { "skillId": "sk-sec-hard", "skillGroupId": "grp-sec", "skillGroupName": "Cybersecurity", "skillLevel": "Hard", "name": "Security (ระดับยาก)", "description": "เข้าใจ Network Defense, Cryptography และ Incident Response", "PLO": "PLO2", "category": "hard skill", "subcategory": "Security", "yearLevel": 4, "isRequired": true, "passingScore": 80 },

    { "skillId": "sk-web-easy", "skillGroupId": "grp-web", "skillGroupName": "Web Application Development", "skillLevel": "Easy", "name": "Web Dev (ระดับง่าย)", "description": "สร้างหน้าเว็บ Static ด้วย HTML5, CSS3 และ JavaScript พื้นฐาน", "PLO": "PLO2", "category": "hard skill", "subcategory": "Web Development", "yearLevel": 2, "isRequired": true, "passingScore": 60 },
    { "skillId": "sk-web-med", "skillGroupId": "grp-web", "skillGroupName": "Web Application Development", "skillLevel": "Medium", "name": "Web Dev (ระดับกลาง)", "description": "เชื่อมต่อ API, ใช้งาน Frontend Framework (React/Vue) และจัดการ State ได้", "PLO": "PLO2", "category": "hard skill", "subcategory": "Web Development", "yearLevel": 3, "isRequired": true, "passingScore": 70 },
    { "skillId": "sk-web-hard", "skillGroupId": "grp-web", "skillGroupName": "Web Application Development", "skillLevel": "Hard", "name": "Web Dev (ระดับยาก)", "description": "พัฒนาระบบ Backend, เชื่อมต่อ Database และ Deploy ขึ้น Server/Cloud ได้", "PLO": "PLO2", "category": "hard skill", "subcategory": "Web Development", "yearLevel": 4, "isRequired": true, "passingScore": 80 },

    { "skillId": "sk-db-easy", "skillGroupId": "grp-db", "skillGroupName": "Database Management", "skillLevel": "Easy", "name": "Database (ระดับง่าย)", "description": "ออกแบบ ER Diagram และเข้าใจ Concept ของ Relational Database", "PLO": "PLO2", "category": "hard skill", "subcategory": "Database", "yearLevel": 2, "isRequired": true, "passingScore": 60 },
    { "skillId": "sk-db-med", "skillGroupId": "grp-db", "skillGroupName": "Database Management", "skillLevel": "Medium", "name": "Database (ระดับกลาง)", "description": "เขียนคำสั่ง SQL (Select, Join, Aggregate) ได้คล่องแคล่ว", "PLO": "PLO2", "category": "hard skill", "subcategory": "Database", "yearLevel": 3, "isRequired": true, "passingScore": 70 },
    { "skillId": "sk-db-hard", "skillGroupId": "grp-db", "skillGroupName": "Database Management", "skillLevel": "Hard", "name": "Database (ระดับยาก)", "description": "ทำ Database Optimization, Indexing หรือใช้งาน NoSQL ได้", "PLO": "PLO2", "category": "hard skill", "subcategory": "Database", "yearLevel": 4, "isRequired": true, "passingScore": 80 },

    { "skillId": "sk-uxui-easy", "skillGroupId": "grp-uxui", "skillGroupName": "UX/UI Design", "skillLevel": "Easy", "name": "UX/UI (ระดับง่าย)", "description": "เข้าใจหลักการออกแบบเบื้องต้น (Color, Typography, Layout)", "PLO": "PLO2", "category": "hard skill", "subcategory": "Design", "yearLevel": 1, "isRequired": true, "passingScore": 60 },
    { "skillId": "sk-uxui-med", "skillGroupId": "grp-uxui", "skillGroupName": "UX/UI Design", "skillLevel": "Medium", "name": "UX/UI (ระดับกลาง)", "description": "ใช้งานเครื่องมือ (Figma/Adobe XD) เพื่อสร้าง Wireframe และ Prototype ได้", "PLO": "PLO2", "category": "hard skill", "subcategory": "Design", "yearLevel": 2, "isRequired": true, "passingScore": 70 },
    { "skillId": "sk-uxui-hard", "skillGroupId": "grp-uxui", "skillGroupName": "UX/UI Design", "skillLevel": "Hard", "name": "UX/UI (ระดับยาก)", "description": "ทำ User Testing, Usability Test และปรับปรุงระบบตาม User Journey ได้", "PLO": "PLO2", "category": "hard skill", "subcategory": "Design", "yearLevel": 3, "isRequired": true, "passingScore": 80 },

    { "skillId": "sk-danal-easy", "skillGroupId": "grp-danal", "skillGroupName": "Data Analytics", "skillLevel": "Easy", "name": "Analytics (ระดับง่าย)", "description": "ใช้งาน Excel หรือ Google Sheets เพื่อวิเคราะห์ข้อมูลเบื้องต้น", "PLO": "PLO2", "category": "hard skill", "subcategory": "Data Science", "yearLevel": 2, "isRequired": true, "passingScore": 60 },
    { "skillId": "sk-danal-med", "skillGroupId": "grp-danal", "skillGroupName": "Data Analytics", "skillLevel": "Medium", "name": "Analytics (ระดับกลาง)", "description": "ใช้ SQL เพื่อดึงข้อมูลวิเคราะห์ และสร้าง Dashboard (Tableau/PowerBI)", "PLO": "PLO2", "category": "hard skill", "subcategory": "Data Science", "yearLevel": 3, "isRequired": true, "passingScore": 70 },
    { "skillId": "sk-danal-hard", "skillGroupId": "grp-danal", "skillGroupName": "Data Analytics", "skillLevel": "Hard", "name": "Analytics (ระดับยาก)", "description": "ใช้ Python (Pandas/Matplotlib) เพื่อวิเคราะห์ข้อมูลซับซ้อน", "PLO": "PLO2", "category": "hard skill", "subcategory": "Data Science", "yearLevel": 4, "isRequired": true, "passingScore": 80 },

    { "skillId": "sk-deng-easy", "skillGroupId": "grp-deng", "skillGroupName": "Data Engineering", "skillLevel": "Easy", "name": "Data Eng (ระดับง่าย)", "description": "เข้าใจแนวคิด Data Pipeline และ ETL Basics", "PLO": "PLO2", "category": "hard skill", "subcategory": "Data Science", "yearLevel": 3, "isRequired": true, "passingScore": 60 },
    { "skillId": "sk-deng-med", "skillGroupId": "grp-deng", "skillGroupName": "Data Engineering", "skillLevel": "Medium", "name": "Data Eng (ระดับกลาง)", "description": "ทำ SQL Optimization และเข้าใจ Data Warehousing", "PLO": "PLO2", "category": "hard skill", "subcategory": "Data Science", "yearLevel": 3, "isRequired": true, "passingScore": 70 },
    { "skillId": "sk-deng-hard", "skillGroupId": "grp-deng", "skillGroupName": "Data Engineering", "skillLevel": "Hard", "name": "Data Eng (ระดับยาก)", "description": "เข้าใจ Big Data Tools (Spark/Hadoop) และ Cloud Data Engineering", "PLO": "PLO2", "category": "hard skill", "subcategory": "Data Science", "yearLevel": 4, "isRequired": true, "passingScore": 80 },

    { "skillId": "sk-stat-easy", "skillGroupId": "grp-stat", "skillGroupName": "Statistical Analysis", "skillLevel": "Easy", "name": "Statistics (ระดับง่าย)", "description": "เข้าใจ Mean, Median, Mode และความน่าจะเป็นพื้นฐาน", "PLO": "PLO2", "category": "hard skill", "subcategory": "Data Science", "yearLevel": 2, "isRequired": true, "passingScore": 60 },
    { "skillId": "sk-stat-med", "skillGroupId": "grp-stat", "skillGroupName": "Statistical Analysis", "skillLevel": "Medium", "name": "Statistics (ระดับกลาง)", "description": "ทำการทดสอบสมมติฐาน (Hypothesis Testing) และ A/B Testing", "PLO": "PLO2", "category": "hard skill", "subcategory": "Data Science", "yearLevel": 3, "isRequired": true, "passingScore": 70 },
    { "skillId": "sk-stat-hard", "skillGroupId": "grp-stat", "skillGroupName": "Statistical Analysis", "skillLevel": "Hard", "name": "Statistics (ระดับยาก)", "description": "ทำ Regression Analysis และ Advanced Modeling", "PLO": "PLO2", "category": "hard skill", "subcategory": "Data Science", "yearLevel": 4, "isRequired": true, "passingScore": 80 },

    { "skillId": "sk-ml-easy", "skillGroupId": "grp-ml", "skillGroupName": "Machine Learning", "skillLevel": "Easy", "name": "ML (ระดับง่าย)", "description": "เข้าใจแนวคิด Supervised vs Unsupervised Learning", "PLO": "PLO2", "category": "hard skill", "subcategory": "Artificial Intelligence", "yearLevel": 3, "isRequired": true, "passingScore": 60 },
    { "skillId": "sk-ml-med", "skillGroupId": "grp-ml", "skillGroupName": "Machine Learning", "skillLevel": "Medium", "name": "ML (ระดับกลาง)", "description": "ใช้งาน Scikit-learn เพื่อเทรนโมเดลและประเมินผล (Evaluation)", "PLO": "PLO2", "category": "hard skill", "subcategory": "Artificial Intelligence", "yearLevel": 3, "isRequired": true, "passingScore": 70 },
    { "skillId": "sk-ml-hard", "skillGroupId": "grp-ml", "skillGroupName": "Machine Learning", "skillLevel": "Hard", "name": "ML (ระดับยาก)", "description": "ทำ Model Deployment และ Hyperparameter Tuning", "PLO": "PLO2", "category": "hard skill", "subcategory": "Artificial Intelligence", "yearLevel": 4, "isRequired": true, "passingScore": 80 },

    { "skillId": "sk-dl-easy", "skillGroupId": "grp-dl", "skillGroupName": "Deep Learning", "skillLevel": "Easy", "name": "Deep Learning (ง่าย)", "description": "เข้าใจพื้นฐาน Neural Network", "PLO": "PLO2", "category": "hard skill", "subcategory": "Artificial Intelligence", "yearLevel": 3, "isRequired": true, "passingScore": 60 },
    { "skillId": "sk-dl-med", "skillGroupId": "grp-dl", "skillGroupName": "Deep Learning", "skillLevel": "Medium", "name": "Deep Learning (กลาง)", "description": "เข้าใจ CNN และการทำ Image Processing (OpenCV)", "PLO": "PLO2", "category": "hard skill", "subcategory": "Artificial Intelligence", "yearLevel": 4, "isRequired": true, "passingScore": 70 },
    { "skillId": "sk-dl-hard", "skillGroupId": "grp-dl", "skillGroupName": "Deep Learning", "skillLevel": "Hard", "name": "Deep Learning (ยาก)", "description": "เข้าใจ Object Detection (YOLO) และใช้งาน TensorFlow/PyTorch", "PLO": "PLO2", "category": "hard skill", "subcategory": "Artificial Intelligence", "yearLevel": 4, "isRequired": true, "passingScore": 80 },

    { "skillId": "sk-genai-easy", "skillGroupId": "grp-genai", "skillGroupName": "Generative AI", "skillLevel": "Easy", "name": "GenAI (ระดับง่าย)", "description": "เข้าใจพื้นฐาน Prompt Engineering", "PLO": "PLO2", "category": "hard skill", "subcategory": "Artificial Intelligence", "yearLevel": 3, "isRequired": true, "passingScore": 60 },
    { "skillId": "sk-genai-med", "skillGroupId": "grp-genai", "skillGroupName": "Generative AI", "skillLevel": "Medium", "name": "GenAI (ระดับกลาง)", "description": "เข้าใจพื้นฐาน NLP (Tokenization, Sentiment Analysis)", "PLO": "PLO2", "category": "hard skill", "subcategory": "Artificial Intelligence", "yearLevel": 4, "isRequired": true, "passingScore": 70 },
    { "skillId": "sk-genai-hard", "skillGroupId": "grp-genai", "skillGroupName": "Generative AI", "skillLevel": "Hard", "name": "GenAI (ระดับยาก)", "description": "เข้าใจการทำ LLM Fine-tuning และ RAG", "PLO": "PLO2", "category": "hard skill", "subcategory": "Artificial Intelligence", "yearLevel": 4, "isRequired": true, "passingScore": 80 },

    // ==========================================
    // 🟡 PLO3: ความรับผิดชอบและจริยธรรม (Mindset)
    // ==========================================
    { "skillId": "sk-probsol-easy", "skillGroupId": "grp-probsol", "skillGroupName": "Problem Solving", "skillLevel": "Easy", "name": "Problem Solving (ง่าย)", "description": "ระบุปัญหาได้ถูกต้อง และเสนอแนวทางแก้ไขเบื้องต้นได้", "PLO": "PLO3", "category": "soft skill", "subcategory": "Critical Thinking", "yearLevel": 1, "isRequired": true, "passingScore": 60 },
    { "skillId": "sk-probsol-med", "skillGroupId": "grp-probsol", "skillGroupName": "Problem Solving", "skillLevel": "Medium", "name": "Problem Solving (กลาง)", "description": "วิเคราะห์หาสาเหตุที่แท้จริง (Root Cause) และเปรียบเทียบทางเลือกได้", "PLO": "PLO3", "category": "soft skill", "subcategory": "Critical Thinking", "yearLevel": 2, "isRequired": true, "passingScore": 70 },
    { "skillId": "sk-probsol-hard", "skillGroupId": "grp-probsol", "skillGroupName": "Problem Solving", "skillLevel": "Hard", "name": "Problem Solving (ยาก)", "description": "แก้ปัญหาเชิงกลยุทธ์ที่ซับซ้อน และสร้างนวัตกรรมในการแก้ปัญหา", "PLO": "PLO3", "category": "soft skill", "subcategory": "Critical Thinking", "yearLevel": 3, "isRequired": true, "passingScore": 80 },

    { "skillId": "sk-detail-easy", "skillGroupId": "grp-detail", "skillGroupName": "Detail Oriented", "skillLevel": "Easy", "name": "Detail (ระดับง่าย)", "description": "ทำงานได้ถูกต้องตามคำสั่ง ตรวจทานงานของตนเองได้", "PLO": "PLO3", "category": "soft skill", "subcategory": "Professionalism", "yearLevel": 1, "isRequired": true, "passingScore": 60 },
    { "skillId": "sk-detail-med", "skillGroupId": "grp-detail", "skillGroupName": "Detail Oriented", "skillLevel": "Medium", "name": "Detail (ระดับกลาง)", "description": "ตรวจสอบคุณภาพงาน (QA) และหาข้อผิดพลาดเล็กๆ น้อยๆ ได้แม่นยำ", "PLO": "PLO3", "category": "soft skill", "subcategory": "Professionalism", "yearLevel": 2, "isRequired": true, "passingScore": 70 },
    { "skillId": "sk-detail-hard", "skillGroupId": "grp-detail", "skillGroupName": "Detail Oriented", "skillLevel": "Hard", "name": "Detail (ระดับยาก)", "description": "วางแผนป้องกันข้อผิดพลาด (Zero-defect mindset) และปรับปรุงกระบวนการ", "PLO": "PLO3", "category": "soft skill", "subcategory": "Professionalism", "yearLevel": 3, "isRequired": true, "passingScore": 80 },

    { "skillId": "sk-growth-easy", "skillGroupId": "grp-growth", "skillGroupName": "Growth Mindset", "skillLevel": "Easy", "name": "Growth (ระดับง่าย)", "description": "เปิดใจรับฟังคำติชม (Feedback) และพร้อมเรียนรู้สิ่งใหม่", "PLO": "PLO3", "category": "soft skill", "subcategory": "Self Development", "yearLevel": 1, "isRequired": true, "passingScore": 60 },
    { "skillId": "sk-growth-med", "skillGroupId": "grp-growth", "skillGroupName": "Growth Mindset", "skillLevel": "Medium", "name": "Growth (ระดับกลาง)", "description": "พยายามพัฒนาทักษะใหม่ๆ (Reskill/Upskill) ด้วยตนเองอย่างสม่ำเสมอ", "PLO": "PLO3", "category": "soft skill", "subcategory": "Self Development", "yearLevel": 2, "isRequired": true, "passingScore": 70 },
    { "skillId": "sk-growth-hard", "skillGroupId": "grp-growth", "skillGroupName": "Growth Mindset", "skillLevel": "Hard", "name": "Growth (ระดับยาก)", "description": "มองความล้มเหลวเป็นบทเรียน มีความยืดหยุ่น (Resilience) และส่งต่อพลังบวก", "PLO": "PLO3", "category": "soft skill", "subcategory": "Self Development", "yearLevel": 3, "isRequired": true, "passingScore": 80 },

    { "skillId": "sk-ethics-easy", "skillGroupId": "grp-ethics", "skillGroupName": "IT Ethics & Law", "skillLevel": "Easy", "name": "Ethics (ระดับง่าย)", "description": "มีความรู้พื้นฐานเรื่องลิขสิทธิ์ (Copyright) และการใช้งาน Software ที่ถูกต้อง", "PLO": "PLO3", "category": "soft skill", "subcategory": "Ethics", "yearLevel": 1, "isRequired": true, "passingScore": 60 },
    { "skillId": "sk-ethics-med", "skillGroupId": "grp-ethics", "skillGroupName": "IT Ethics & Law", "skillLevel": "Medium", "name": "Ethics (ระดับกลาง)", "description": "เข้าใจ พ.ร.บ. คอมพิวเตอร์ และกฎหมายคุ้มครองข้อมูลส่วนบุคคล (PDPA)", "PLO": "PLO3", "category": "soft skill", "subcategory": "Ethics", "yearLevel": 2, "isRequired": true, "passingScore": 70 },
    { "skillId": "sk-ethics-hard", "skillGroupId": "grp-ethics", "skillGroupName": "IT Ethics & Law", "skillLevel": "Hard", "name": "Ethics (ระดับยาก)", "description": "วิเคราะห์กรณีศึกษาทางจริยธรรม และประยุกต์ใช้ในการตัดสินใจทำงานจริงได้", "PLO": "PLO3", "category": "soft skill", "subcategory": "Ethics", "yearLevel": 3, "isRequired": true, "passingScore": 80 },

    { "skillId": "sk-time-easy", "skillGroupId": "grp-time", "skillGroupName": "Time Management", "skillLevel": "Easy", "name": "Time Mgmt (ระดับง่าย)", "description": "เข้าเรียน/เข้าร่วมกิจกรรมตรงเวลา และส่งงานตามกำหนด (Punctuality)", "PLO": "PLO3", "category": "soft skill", "subcategory": "Self Development", "yearLevel": 1, "isRequired": true, "passingScore": 60 },
    { "skillId": "sk-time-med", "skillGroupId": "grp-time", "skillGroupName": "Time Management", "skillLevel": "Medium", "name": "Time Mgmt (ระดับกลาง)", "description": "สามารถวางแผนลำดับความสำคัญของงาน (Prioritization) ได้ดี", "PLO": "PLO3", "category": "soft skill", "subcategory": "Self Development", "yearLevel": 2, "isRequired": true, "passingScore": 70 },
    { "skillId": "sk-time-hard", "skillGroupId": "grp-time", "skillGroupName": "Time Management", "skillLevel": "Hard", "name": "Time Mgmt (ระดับยาก)", "description": "บริหารจัดการโปรเจกต์ระยะยาวให้เสร็จทันตาม Timeline โดยไม่เผางาน", "PLO": "PLO3", "category": "soft skill", "subcategory": "Self Development", "yearLevel": 3, "isRequired": true, "passingScore": 80 },

    // ==========================================
    // 🔴 PLO4: การทำงานร่วมกับผู้อื่น (Leadership & Team)
    // ==========================================
    { "skillId": "sk-leader-easy", "skillGroupId": "grp-leader", "skillGroupName": "Leadership", "skillLevel": "Easy", "name": "Leadership (ระดับง่าย)", "description": "กล้าแสดงความคิดเห็น และนำกิจกรรมกลุ่มย่อยได้", "PLO": "PLO4", "category": "soft skill", "subcategory": "Leadership", "yearLevel": 2, "isRequired": true, "passingScore": 60 },
    { "skillId": "sk-leader-med", "skillGroupId": "grp-leader", "skillGroupName": "Leadership", "skillLevel": "Medium", "name": "Leadership (ระดับกลาง)", "description": "สามารถจูงใจเพื่อนร่วมทีม และช่วยไกล่เกลี่ยความขัดแย้ง", "PLO": "PLO4", "category": "soft skill", "subcategory": "Leadership", "yearLevel": 3, "isRequired": true, "passingScore": 70 },
    { "skillId": "sk-leader-hard", "skillGroupId": "grp-leader", "skillGroupName": "Leadership", "skillLevel": "Hard", "name": "Leadership (ระดับยาก)", "description": "วางวิสัยทัศน์ ตัดสินใจเชิงกลยุทธ์ และเป็น Mentor ให้ผู้อื่นได้", "PLO": "PLO4", "category": "soft skill", "subcategory": "Leadership", "yearLevel": 4, "isRequired": true, "passingScore": 80 },

    { "skillId": "sk-collab-easy", "skillGroupId": "grp-collab", "skillGroupName": "Team Collaboration", "skillLevel": "Easy", "name": "Collaboration (ง่าย)", "description": "ให้ความร่วมมือ สนับสนุน และเคารพความเห็นสมาชิกในทีม", "PLO": "PLO4", "category": "soft skill", "subcategory": "Teamwork", "yearLevel": 1, "isRequired": true, "passingScore": 60 },
    { "skillId": "sk-collab-med", "skillGroupId": "grp-collab", "skillGroupName": "Team Collaboration", "skillLevel": "Medium", "name": "Collaboration (กลาง)", "description": "สื่อสารแลกเปลี่ยนข้อมูลในทีมได้อย่างลื่นไหล และช่วยแก้ปัญหาทีม", "PLO": "PLO4", "category": "soft skill", "subcategory": "Teamwork", "yearLevel": 2, "isRequired": true, "passingScore": 70 },
    { "skillId": "sk-collab-hard", "skillGroupId": "grp-collab", "skillGroupName": "Team Collaboration", "skillLevel": "Hard", "name": "Collaboration (ยาก)", "description": "ทำงานร่วมกับฝ่ายอื่นๆ (Cross-functional) และสร้างวัฒนธรรมทีมที่ดี", "PLO": "PLO4", "category": "soft skill", "subcategory": "Teamwork", "yearLevel": 3, "isRequired": true, "passingScore": 80 },

    { "skillId": "sk-comm-easy", "skillGroupId": "grp-comm", "skillGroupName": "Effective Communication", "skillLevel": "Easy", "name": "Communication (ระดับง่าย)", "description": "สื่อสารข้อมูลได้ชัดเจน เข้าใจง่าย ทั้งการพูดและเขียน", "PLO": "PLO4", "category": "soft skill", "subcategory": "Communication", "yearLevel": 1, "isRequired": true, "passingScore": 60 },
    { "skillId": "sk-comm-med", "skillGroupId": "grp-comm", "skillGroupName": "Effective Communication", "skillLevel": "Medium", "name": "Communication (ระดับกลาง)", "description": "นำเสนองาน (Presentation) ต่อหน้าสาธารณชนได้ดี มีความเป็นมืออาชีพ", "PLO": "PLO4", "category": "soft skill", "subcategory": "Communication", "yearLevel": 2, "isRequired": true, "passingScore": 70 },
    { "skillId": "sk-comm-hard", "skillGroupId": "grp-comm", "skillGroupName": "Effective Communication", "skillLevel": "Hard", "name": "Communication (ระดับยาก)", "description": "มีทักษะการเจรจาต่อรอง (Negotiation) และโน้มน้าวใจผู้อื่นได้", "PLO": "PLO4", "category": "soft skill", "subcategory": "Communication", "yearLevel": 3, "isRequired": true, "passingScore": 80 },

    { "skillId": "sk-agile-easy", "skillGroupId": "grp-agile", "skillGroupName": "Agile & Teamwork", "skillLevel": "Easy", "name": "Teamwork (ระดับง่าย)", "description": "เป็นผู้ตามที่ดี รับผิดชอบงานส่วนของตนเองในทีมได้", "PLO": "PLO4", "category": "soft skill", "subcategory": "Teamwork", "yearLevel": 2, "isRequired": true, "passingScore": 60 },
    { "skillId": "sk-agile-med", "skillGroupId": "grp-agile", "skillGroupName": "Agile & Teamwork", "skillLevel": "Medium", "name": "Teamwork (ระดับกลาง)", "description": "เข้าใจกระบวนการ Scrum/Agile และใช้เครื่องมือ (Trello/Jira) ร่วมกับทีมได้", "PLO": "PLO4", "category": "soft skill", "subcategory": "Teamwork", "yearLevel": 3, "isRequired": true, "passingScore": 70 },
    { "skillId": "sk-agile-hard", "skillGroupId": "grp-agile", "skillGroupName": "Agile & Teamwork", "skillLevel": "Hard", "name": "Teamwork (ระดับยาก)", "description": "แสดงภาวะผู้นำ (Leadership) หรือทำหน้าที่ Scrum Master/Leader ในโปรเจกต์ได้", "PLO": "PLO4", "category": "soft skill", "subcategory": "Teamwork", "yearLevel": 4, "isRequired": true, "passingScore": 80 }
  ];

  // 3. ยัดข้อมูล (Loop PutItem)
  let successCount = 0;
  let failCount = 0;

  console.log(`🚀 Starting import for ${allSkillsData.length} skills...`);

  for (const item of allSkillsData) {
    try {
      await docClient.send(new PutCommand({
        TableName: TABLE_NAME,
        Item: item
      }));
      successCount++;
      // console.log(`✅ Inserted: ${item.skillId}`); // Uncomment ถ้าอยากเห็น log เยอะๆ
    } catch (err) {
      failCount++;
      console.error(`❌ Failed: ${item.skillId}`, err);
    }
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ 
      message: "Full Setup Complete!", 
      table: TABLE_NAME,
      success: successCount, 
      failed: failCount 
    })
  };
};