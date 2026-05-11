const express = require("express");
const router = express.Router();
const db = require("../config/database");
const { verifyToken, isAdmin } = require("../middileware/authMiddleware");

// CREATE - Admin only
router.post("/new", verifyToken, isAdmin, (req,res)=>{
  const { first_name,last_name,emp_email,mobile,job_title,emp_role,quotation_count } = req.body;

  if(!first_name || !last_name || !emp_email || !mobile || !job_title || !emp_role){
    return res.status(400).json({message:"All Field Required"});
  }

  const sql = `
  INSERT INTO teammember
  (first_name,last_name,emp_email,mobile,job_title,emp_role,quotation_count)
  VALUES (?,?,?,?,?,?,?)
  `;

  db.query(sql,[first_name,last_name,emp_email,mobile,job_title,emp_role,quotation_count || 0],
    (err,result)=>{
      if(err) return res.status(500).json(err);
      res.json({success:true});
    });
});


/* GET ALL - Admin only */
router.get("/", verifyToken, isAdmin, (req,res)=>{
  db.query("SELECT * FROM teammember ORDER BY id DESC",(err,result)=>{
    if(err) return res.status(500).json(err);
    res.json(result);
  });
});

/* GET ALL - Public (for dropdowns) */
router.get("/list", (req,res)=>{
  db.query("SELECT id, first_name, last_name, emp_email, job_title, emp_role, user_id FROM teammember ORDER BY first_name",(err,result)=>{
    if(err) return res.status(500).json(err);
    res.json(result);
  });
});


// Edit - Admin only
router.put("/:id", verifyToken, isAdmin, (req,res)=>{
  const { first_name,last_name,emp_email,mobile,job_title,emp_role,quotation_count } = req.body;

  const sql = `
   UPDATE teammember 
   SET first_name=?, last_name=?, emp_email=?, mobile=?, job_title=?, emp_role=?, quotation_count=?
   WHERE id=?
  `;

  db.query(sql,
    [first_name,last_name,emp_email,mobile,job_title,emp_role,quotation_count || 0,req.params.id],
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
