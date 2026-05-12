const express = require("express");
const router = express.Router();
const db = require("../config/database");
const { verifyToken, isAdmin } = require("../middileware/authMiddleware");

// CREATE - Admin only
router.post("/new", verifyToken, isAdmin, (req,res)=>{
  const { first_name,last_name,emp_email,mobile,job_title,emp_role,quotation_count,emp_id } = req.body;

  if(!first_name || !last_name || !emp_email || !mobile || !job_title || !emp_role){
    return res.status(400).json({message:"All Field Required"});
  }

  const sql = `
  INSERT INTO teammember
  (first_name,last_name,emp_email,mobile,job_title,emp_role,quotation_count,emp_id)
  VALUES (?,?,?,?,?,?,?,?)
  `;

  db.query(sql,[first_name,last_name,emp_email,mobile,job_title,emp_role,quotation_count || 0, emp_id || null],
    (err,result)=>{
      if(err) return res.status(500).json(err);
      res.json({success:true});
    });
});


/* GET ALL - Public (for dropdowns in forms) - No auth required */
router.get("/", (req, res) => {
  db.query("SELECT id, first_name, last_name, emp_email, job_title, emp_role, user_id, emp_id, mobile, emp_address FROM teammember ORDER BY first_name", (err, result) => {
    if (err) return res.status(500).json(err);
    res.json(result);
  });
});

/* GET ALL - Admin only (full data) */
router.get("/admin", require("../middileware/authMiddleware").verifyToken, require("../middileware/authMiddleware").isAdmin, (req, res) => {
  db.query("SELECT * FROM teammember ORDER BY id DESC", (err, result) => {
    if (err) return res.status(500).json(err);
    res.json(result);
  });
});

/* GET ALL - Public (for dropdowns) */
router.get("/list", (req,res)=>{
  db.query("SELECT id, first_name, last_name, emp_email, job_title, emp_role, user_id, emp_id FROM teammember ORDER BY first_name",(err,result)=>{
    if(err) return res.status(500).json(err);
    res.json(result);
  });
});

/* GET by user_id - Get team member linked to a user account */
router.get("/by-user/:userId", verifyToken, (req, res) => {
  db.query(
    "SELECT * FROM teammember WHERE user_id = ?",
    [req.params.userId],
    (err, result) => {
      if (err) return res.status(500).json(err);
      res.json(result[0] || null);
    }
  );
});

/* GET single by id */
router.get("/:id", verifyToken, (req, res) => {
  db.query(
    `SELECT t.*, u.email, u.role as user_role 
     FROM teammember t 
     LEFT JOIN users u ON t.user_id = u.id 
     WHERE t.id = ?`,
    [req.params.id],
    (err, result) => {
      if (err) return res.status(500).json(err);
      if (result.length === 0) return res.status(404).json({ message: "Not found" });
      res.json(result[0]);
    }
  );
});


// Edit - Admin only
router.put("/:id", verifyToken, isAdmin, (req,res)=>{
  const { first_name,last_name,emp_email,mobile,job_title,emp_role,quotation_count,emp_id } = req.body;

  const sql = `
   UPDATE teammember 
   SET first_name=?, last_name=?, emp_email=?, mobile=?, job_title=?, emp_role=?, quotation_count=?, emp_id=?
   WHERE id=?
  `;

  db.query(sql,
    [first_name,last_name,emp_email,mobile,job_title,emp_role,quotation_count || 0,emp_id || null,req.params.id],
    (err)=>{
      if(err) return res.status(500).json(err);
      res.json({success:true});
    }
  );
});


/* DELETE - Admin only */
router.delete("/:id", verifyToken, isAdmin, (req,res)=>{
  db.query("DELETE FROM teammember WHERE id=?",[req.params.id],(err)=>{
    if(err) return res.status(500).json(err);
    res.json({success:true});
  });
});

module.exports = router;
