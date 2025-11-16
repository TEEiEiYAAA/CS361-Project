// this is automate script to import predefined skills into DynamoDB Skills table
// run this script once to populate the table
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

// ชื่อตารางของคุณ
const TABLE_NAME = "Skills"; 

export const handler = async (event) => {
  // ข้อมูลทั้งหมด 27 รายการ (รวม PLO1, 2, 3, 4)
  const allSkills = [
    // --- PLO1 ---
    { "skillId": "sk-python-easy", "skillGroupId": "grp-python", "skillGroupName": "Python Programming", "skillLevel": "Easy", "name": "Python (ระดับง่าย)", "description": "เขียน Syntax พื้นฐาน, ตัวแปร, Loop และ Condition ได้ถูกต้อง", "PLO": "PLO1", "category": "hard skill", "subcategory": "Programming", "yearLevel": 1, "isRequired": true, "passingScore": 60 },
    { "skillId": "sk-python-med", "skillGroupId": "grp-python", "skillGroupName": "Python Programming", "skillLevel": "Medium", "name": "Python (ระดับกลาง)", "description": "ใช้งาน Function, Modules และจัดการ File/Error Handling ได้", "PLO": "PLO1", "category": "hard skill", "subcategory": "Programming", "yearLevel": 2, "isRequired": true, "passingScore": 70 },
    { "skillId": "sk-python-hard", "skillGroupId": "grp-python", "skillGroupName": "Python Programming", "skillLevel": "Hard", "name": "Python (ระดับยาก)", "description": "เข้าใจ OOP, Decorators และประยุกต์ใช้กับงาน Data Science หรือ Web ได้", "PLO": "PLO1", "category": "hard skill", "subcategory": "Programming", "yearLevel": 3, "isRequired": true, "passingScore": 80 },
    { "skillId": "sk-dsa-easy", "skillGroupId": "grp-dsa", "skillGroupName": "Data Structures & Algorithms", "skillLevel": "Easy", "name": "DSA (ระดับง่าย)", "description": "เข้าใจโครงสร้าง Array, Linked List, Stack และ Queue", "PLO": "PLO1", "category": "hard skill", "subcategory": "Computer Science", "yearLevel": 1, "isRequired": true, "passingScore": 60 },
    { "skillId": "sk-dsa-med", "skillGroupId": "grp-dsa", "skillGroupName": "Data Structures & Algorithms", "skillLevel": "Medium", "name": "DSA (ระดับกลาง)", "description": "เข้าใจโครงสร้าง Tree, Graph และ Sorting Algorithms พื้นฐาน", "PLO": "PLO1", "category": "hard skill", "subcategory": "Computer Science", "yearLevel": 2, "isRequired": true, "passingScore": 70 },
    { "skillId": "sk-dsa-hard", "skillGroupId": "grp-dsa", "skillGroupName": "Data Structures & Algorithms", "skillLevel": "Hard", "name": "DSA (ระดับยาก)", "description": "วิเคราะห์ Time Complexity (Big O) และประยุกต์ใช้แก้โจทย์ซับซ้อนได้", "PLO": "PLO1", "category": "hard skill", "subcategory": "Computer Science", "yearLevel": 3, "isRequired": true, "passingScore": 80 },
    
    // --- PLO2 ---
    { "skillId": "sk-web-easy", "skillGroupId": "grp-web", "skillGroupName": "Web Application Development", "skillLevel": "Easy", "name": "Web Dev (ระดับง่าย)", "description": "สร้างหน้าเว็บ Static ด้วย HTML5, CSS3 และ JavaScript พื้นฐาน", "PLO": "PLO2", "category": "hard skill", "subcategory": "Web Development", "yearLevel": 2, "isRequired": true, "passingScore": 60 },
    { "skillId": "sk-web-med", "skillGroupId": "grp-web", "skillGroupName": "Web Application Development", "skillLevel": "Medium", "name": "Web Dev (ระดับกลาง)", "description": "เชื่อมต่อ API, ใช้งาน Frontend Framework (React/Vue) และจัดการ State ได้", "PLO": "PLO2", "category": "hard skill", "subcategory": "Web Development", "yearLevel": 3, "isRequired": true, "passingScore": 70 },
    { "skillId": "sk-web-hard", "skillGroupId": "grp-web", "skillGroupName": "Web Application Development", "skillLevel": "Hard", "name": "Web Dev (ระดับยาก)", "description": "พัฒนาระบบ Backend, เชื่อมต่อ Database และ Deploy ขึ้น Server/Cloud ได้", "PLO": "PLO2", "category": "hard skill", "subcategory": "Web Development", "yearLevel": 4, "isRequired": true, "passingScore": 80 },
    { "skillId": "sk-db-easy", "skillGroupId": "grp-db", "skillGroupName": "Database Management", "skillLevel": "Easy", "name": "Database (ระดับง่าย)", "description": "ออกแบบ ER Diagram และเข้าใจ Concept ของ Relational Database", "PLO": "PLO2", "category": "hard skill", "subcategory": "Database", "yearLevel": 2, "isRequired": true, "passingScore": 60 },
    { "skillId": "sk-db-med", "skillGroupId": "grp-db", "skillGroupName": "Database Management", "skillLevel": "Medium", "name": "Database (ระดับกลาง)", "description": "เขียนคำสั่ง SQL (Select, Join, Aggregate) ได้คล่องแคล่ว", "PLO": "PLO2", "category": "hard skill", "subcategory": "Database", "yearLevel": 3, "isRequired": true, "passingScore": 70 },
    { "skillId": "sk-db-hard", "skillGroupId": "grp-db", "skillGroupName": "Database Management", "skillLevel": "Hard", "name": "Database (ระดับยาก)", "description": "ทำ Database Optimization, Indexing หรือใช้งาน NoSQL ได้", "PLO": "PLO2", "category": "hard skill", "subcategory": "Database", "yearLevel": 4, "isRequired": true, "passingScore": 80 },
    { "skillId": "sk-uxui-easy", "skillGroupId": "grp-uxui", "skillGroupName": "UX/UI Design", "skillLevel": "Easy", "name": "UX/UI (ระดับง่าย)", "description": "เข้าใจหลักการออกแบบเบื้องต้น (Color, Typography, Layout)", "PLO": "PLO2", "category": "hard skill", "subcategory": "Design", "yearLevel": 1, "isRequired": true, "passingScore": 60 },
    { "skillId": "sk-uxui-med", "skillGroupId": "grp-uxui", "skillGroupName": "UX/UI Design", "skillLevel": "Medium", "name": "UX/UI (ระดับกลาง)", "description": "ใช้งานเครื่องมือ (Figma/Adobe XD) เพื่อสร้าง Wireframe และ Prototype ได้", "PLO": "PLO2", "category": "hard skill", "subcategory": "Design", "yearLevel": 2, "isRequired": true, "passingScore": 70 },
    { "skillId": "sk-uxui-hard", "skillGroupId": "grp-uxui", "skillGroupName": "UX/UI Design", "skillLevel": "Hard", "name": "UX/UI (ระดับยาก)", "description": "ทำ User Testing, Usability Test และปรับปรุงระบบตาม User Journey ได้", "PLO": "PLO2", "category": "hard skill", "subcategory": "Design", "yearLevel": 3, "isRequired": true, "passingScore": 80 },

    // --- PLO3 ---
    { "skillId": "sk-ethics-easy", "skillGroupId": "grp-ethics", "skillGroupName": "IT Ethics & Law", "skillLevel": "Easy", "name": "Ethics (ระดับง่าย)", "description": "มีความรู้พื้นฐานเรื่องลิขสิทธิ์ (Copyright) และการใช้งาน Software ที่ถูกต้อง", "PLO": "PLO3", "category": "soft skill", "subcategory": "Ethics", "yearLevel": 1, "isRequired": true, "passingScore": 60 },
    { "skillId": "sk-ethics-med", "skillGroupId": "grp-ethics", "skillGroupName": "IT Ethics & Law", "skillLevel": "Medium", "name": "Ethics (ระดับกลาง)", "description": "เข้าใจ พ.ร.บ. คอมพิวเตอร์ และกฎหมายคุ้มครองข้อมูลส่วนบุคคล (PDPA)", "PLO": "PLO3", "category": "soft skill", "subcategory": "Ethics", "yearLevel": 2, "isRequired": true, "passingScore": 70 },
    { "skillId": "sk-ethics-hard", "skillGroupId": "grp-ethics", "skillGroupName": "IT Ethics & Law", "skillLevel": "Hard", "name": "Ethics (ระดับยาก)", "description": "วิเคราะห์กรณีศึกษาทางจริยธรรม และประยุกต์ใช้ในการตัดสินใจทำงานจริงได้", "PLO": "PLO3", "category": "soft skill", "subcategory": "Ethics", "yearLevel": 3, "isRequired": true, "passingScore": 80 },
    { "skillId": "sk-time-easy", "skillGroupId": "grp-time", "skillGroupName": "Time Management", "skillLevel": "Easy", "name": "Time Mgmt (ระดับง่าย)", "description": "เข้าเรียน/เข้าร่วมกิจกรรมตรงเวลา และส่งงานตามกำหนด (Punctuality)", "PLO": "PLO3", "category": "soft skill", "subcategory": "Self Development", "yearLevel": 1, "isRequired": true, "passingScore": 60 },
    { "skillId": "sk-time-med", "skillGroupId": "grp-time", "skillGroupName": "Time Management", "skillLevel": "Medium", "name": "Time Mgmt (ระดับกลาง)", "description": "สามารถวางแผนลำดับความสำคัญของงาน (Prioritization) ได้ดี", "PLO": "PLO3", "category": "soft skill", "subcategory": "Self Development", "yearLevel": 2, "isRequired": true, "passingScore": 70 },
    { "skillId": "sk-time-hard", "skillGroupId": "grp-time", "skillGroupName": "Time Management", "skillLevel": "Hard", "name": "Time Mgmt (ระดับยาก)", "description": "บริหารจัดการโปรเจกต์ระยะยาวให้เสร็จทันตาม Timeline โดยไม่เผางาน", "PLO": "PLO3", "category": "soft skill", "subcategory": "Self Development", "yearLevel": 3, "isRequired": true, "passingScore": 80 },

    // --- PLO4 ---
    { "skillId": "sk-comm-easy", "skillGroupId": "grp-comm", "skillGroupName": "Effective Communication", "skillLevel": "Easy", "name": "Communication (ระดับง่าย)", "description": "สื่อสารข้อมูลได้ชัดเจน เข้าใจง่าย ทั้งการพูดและเขียน", "PLO": "PLO4", "category": "soft skill", "subcategory": "Communication", "yearLevel": 1, "isRequired": true, "passingScore": 60 },
    { "skillId": "sk-comm-med", "skillGroupId": "grp-comm", "skillGroupName": "Effective Communication", "skillLevel": "Medium", "name": "Communication (ระดับกลาง)", "description": "นำเสนองาน (Presentation) ต่อหน้าสาธารณชนได้ดี มีความเป็นมืออาชีพ", "PLO": "PLO4", "category": "soft skill", "subcategory": "Communication", "yearLevel": 2, "isRequired": true, "passingScore": 70 },
    { "skillId": "sk-comm-hard", "skillGroupId": "grp-comm", "skillGroupName": "Effective Communication", "skillLevel": "Hard", "name": "Communication (ระดับยาก)", "description": "มีทักษะการเจรจาต่อรอง (Negotiation) และโน้มน้าวใจผู้อื่นได้", "PLO": "PLO4", "category": "soft skill", "subcategory": "Communication", "yearLevel": 3, "isRequired": true, "passingScore": 80 },
    { "skillId": "sk-agile-easy", "skillGroupId": "grp-agile", "skillGroupName": "Agile & Teamwork", "skillLevel": "Easy", "name": "Teamwork (ระดับง่าย)", "description": "เป็นผู้ตามที่ดี รับผิดชอบงานส่วนของตนเองในทีมได้", "PLO": "PLO4", "category": "soft skill", "subcategory": "Teamwork", "yearLevel": 2, "isRequired": true, "passingScore": 60 },
    { "skillId": "sk-agile-med", "skillGroupId": "grp-agile", "skillGroupName": "Agile & Teamwork", "skillLevel": "Medium", "name": "Teamwork (ระดับกลาง)", "description": "เข้าใจกระบวนการ Scrum/Agile และใช้เครื่องมือ (Trello/Jira) ร่วมกับทีมได้", "PLO": "PLO4", "category": "soft skill", "subcategory": "Teamwork", "yearLevel": 3, "isRequired": true, "passingScore": 70 },
    { "skillId": "sk-agile-hard", "skillGroupId": "grp-agile", "skillGroupName": "Agile & Teamwork", "skillLevel": "Hard", "name": "Teamwork (ระดับยาก)", "description": "แสดงภาวะผู้นำ (Leadership) หรือทำหน้าที่ Scrum Master/Leader ในโปรเจกต์ได้", "PLO": "PLO4", "category": "soft skill", "subcategory": "Teamwork", "yearLevel": 4, "isRequired": true, "passingScore": 80 }
  ];

  let successCount = 0;
  let failCount = 0;

  // วนลูปยัดข้อมูลทีละตัว
  for (const item of allSkills) {
    try {
      await docClient.send(new PutCommand({
        TableName: TABLE_NAME,
        Item: item
      }));
      successCount++;
      console.log(`✅ Inserted: ${item.skillId}`);
    } catch (err) {
      failCount++;
      console.error(`❌ Failed: ${item.skillId}`, err);
    }
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ 
      message: "Import Complete!", 
      success: successCount, 
      failed: failCount 
    })
  };
};