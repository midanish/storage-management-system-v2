const express = require('express');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const nodemailer = require('nodemailer');
const cron = require('node-cron');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      "default-src": ["'self'"],
      "script-src": ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com"],
      "script-src-attr": ["'unsafe-inline'"],
      "style-src": ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com"],
      "font-src": ["'self'", "https://cdnjs.cloudflare.com"],
      "connect-src": ["'self'", "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com"],
      "img-src": ["'self'", "data:", "https:"],
      "object-src": ["'none'"],
      "frame-src": ["'none'"]
    }
  }
}));
app.use(cors());
app.use(express.json());
app.use(express.static('frontend/public'));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});
app.use(limiter);

// Database configuration for both local and Vercel deployment
let pool;

if (process.env.DATABASE_URL) {
  // For Vercel deployment with connection string
  pool = mysql.createPool(process.env.DATABASE_URL);
} else {
  // For local development with individual parameters
  pool = mysql.createPool({
    host: process.env.DB_HOST || 'mysql-3360b0d4-midanish2k-cba9.j.aivencloud.com',
    port: process.env.DB_PORT || 27529,
    user: process.env.DB_USER || 'avnadmin',
    password: process.env.DB_PASSWORD || 'AVNS_0ATKXC8sc7tmTtr6eGs',
    database: process.env.DB_NAME || 'defaultdb',
    ssl: { rejectUnauthorized: false },
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  });
}

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.sendStatus(401);
  }

  jwt.verify(token, process.env.JWT_SECRET || 'default_secret', (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

const authorizeRole = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied' });
    }
    next();
  };
};

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const [users] = await pool.execute(
      'SELECT * FROM user WHERE Email = ?',
      [email]
    );

    if (users.length === 0) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const user = users[0];

    // Password should match the username
    if (password !== user.Username) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      {
        id: user.ID,
        email: user.Email,
        role: user.Role,
        username: user.Username
      },
      process.env.JWT_SECRET || 'default_secret',
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: user.ID,
        username: user.Username,
        email: user.Email,
        role: user.Role,
        level: user.Level,
        borrow: user.Borrow,
        return: user.Return,
        verify: user.Verify
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.get('/api/packages', authenticateToken, async (req, res) => {
  try {
    const [packages] = await pool.execute('SELECT * FROM package ORDER BY ID DESC');
    res.json(packages);
  } catch (error) {
    console.error('Get packages error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.get('/api/packages/options', authenticateToken, async (req, res) => {
  try {
    const [categories] = await pool.execute('SELECT DISTINCT Category FROM package WHERE Category IS NOT NULL');
    const [shifts] = await pool.execute('SELECT DISTINCT `SampleCreatedByShift(A/B/C)` FROM package WHERE `SampleCreatedByShift(A/B/C)` IS NOT NULL');
    const [cabinets] = await pool.execute('SELECT DISTINCT `Temporary Cabinet` FROM package WHERE `Temporary Cabinet` IS NOT NULL');

    res.json({
      categories: categories.map(c => c.Category),
      shifts: shifts.map(s => s['SampleCreatedByShift(A/B/C)']),
      cabinets: cabinets.map(c => c['Temporary Cabinet'])
    });
  } catch (error) {
    console.error('Get options error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/api/packages', authenticateToken, async (req, res) => {
  try {
    const {
      packagecode,
      packagedescription,
      temporaryCabinet,
      category,
      sampleCreatedByShift,
      materialAtEngRoom = 'YES',
      ...defectCounts
    } = req.body;

    // Validate required fields and convert undefined to appropriate values
    if (!packagecode || !temporaryCabinet || !category || !sampleCreatedByShift) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const totalSample = Object.values(defectCounts).reduce((sum, val) => sum + (parseInt(val) || 0), 0);

    const checkCabinet = await pool.execute(
      'SELECT COUNT(*) as count FROM package WHERE `Temporary Cabinet` = ?',
      [temporaryCabinet]
    );

    if (checkCabinet[0][0].count > 0) {
      return res.status(400).json({ message: 'Temporary Cabinet already exists' });
    }

    const query = `
      INSERT INTO package (
        Packagecode, Packagedescription, \`Temporary Cabinet\`, Category,
        \`SampleCreatedByShift(A/B/C)\`, \`MATERIAL AT ENG ROOM\`, TotalSample,
        Dummyunit, \`WhiteFM(Substrate)\`, \`BlackFM(Substrate)\`, \`Chip(Substrate)\`,
        \`Scratches(Substrate)\`, \`Crack(Substrate)\`, \`FMonFoot(Substrate)\`,
        \`FMonShoulder(Substrate)\`, \`NFA(Substrate)\`, \`PFA(Substrate)\`,
        \`Footburr(Substrate)\`, \`Shoulderbur(Substrate)\`, \`Exposecopper(Substrate)\`,
        \`Resinbleed(Substrate)\`, \`void(Substrate)\`, \`Copla(Substrate)\`,
        \`WhiteFM(Mold/MetalLid)\`, \`BlackFM(Mold/MetalLid)\`, \`EdgeChip(Mold/MetalLid)\`,
        \`CornerChip(Mold/MetalLid)\`, \`Scratches(Mold/MetalLid)\`, \`Crack(Mold/MetalLid)\`,
        \`Illegiblemarking(Mold/MetalLid)\`, \`WhiteFM(Die)\`, \`BlackFM(Die)\`,
        \`Chip(Die)\`, \`Scratches(Die)\`, \`Crack(Die)\`, \`WhiteFM(BottomDefect)\`,
        \`BlackFM(BottomDefect)\`, \`Chip(BottomDefect)\`, \`Scratches(BottomDefect)\`,
        \`Crack(BottomDefect)\`, \`Damageball(BottomDefect)\`, \`Multiple Defect\`,
        Pitch, Sliver, \`Ball Discoloration\`, Burr, \`FM on Dambar\`, \`FM on Lead\`,
        \`Expose Copper on Dambar\`, \`Mold Flash\`, \`Metallic Particle\`,
        Patchback, \`Bent Lead\`, \`Expose Tie Bar\`, Fiber, \`Tool Mark\`,
        \`Good Unit\`, \`Lead Shining\`, \`Acid Test Burr\`
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
               ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
               ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
      packagecode, packagedescription || '', temporaryCabinet, category,
      sampleCreatedByShift, materialAtEngRoom, totalSample,
      defectCounts.dummyunit || 0,
      defectCounts.whiteFMSubstrate || 0,
      defectCounts.blackFMSubstrate || 0,
      defectCounts.chipSubstrate || 0,
      defectCounts.scratchesSubstrate || 0,
      defectCounts.crackSubstrate || 0,
      defectCounts.fmOnFootSubstrate || 0,
      defectCounts.fmOnShoulderSubstrate || 0,
      defectCounts.nfaSubstrate || 0,
      defectCounts.pfaSubstrate || 0,
      defectCounts.footburrSubstrate || 0,
      defectCounts.shoulderburSubstrate || 0,
      defectCounts.exposecopperSubstrate || 0,
      defectCounts.resinbleedSubstrate || 0,
      defectCounts.voidSubstrate || 0,
      defectCounts.coplaSubstrate || 0,
      defectCounts.whiteFMMold || 0,
      defectCounts.blackFMMold || 0,
      defectCounts.edgeChipMold || 0,
      defectCounts.cornerChipMold || 0,
      defectCounts.scratchesMold || 0,
      defectCounts.crackMold || 0,
      defectCounts.illegiblemarkingMold || 0,
      defectCounts.whiteFMDie || 0,
      defectCounts.blackFMDie || 0,
      defectCounts.chipDie || 0,
      defectCounts.scratchesDie || 0,
      defectCounts.crackDie || 0,
      defectCounts.whiteFMBottom || 0,
      defectCounts.blackFMBottom || 0,
      defectCounts.chipBottom || 0,
      defectCounts.scratchesBottom || 0,
      defectCounts.crackBottom || 0,
      defectCounts.damageballBottom || 0,
      defectCounts.multipleDefect || 0,
      defectCounts.pitch || 0,
      defectCounts.sliver || 0,
      defectCounts.ballDiscoloration || 0,
      defectCounts.burr || 0,
      defectCounts.fmOnDambar || 0,
      defectCounts.fmOnLead || 0,
      defectCounts.exposeCopperOnDambar || 0,
      defectCounts.moldFlash || 0,
      defectCounts.metallicParticle || 0,
      defectCounts.patchback || 0,
      defectCounts.bentLead || 0,
      defectCounts.exposeTieBar || 0,
      defectCounts.fiber || 0,
      defectCounts.toolMark || 0,
      defectCounts.goodUnit || 0,
      defectCounts.leadShining || 0,
      defectCounts.acidTestBurr || 0
    ];

    const [result] = await pool.execute(query, values);
    res.json({ message: 'Package added successfully', id: result.insertId });
  } catch (error) {
    console.error('Add package error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.put('/api/packages/:id', authenticateToken, authorizeRole('Admin'), async (req, res) => {
  try {
    const packageId = req.params.id;
    const updateData = req.body;

    const fields = Object.keys(updateData).map(key => `\`${key}\` = ?`).join(', ');
    const values = Object.values(updateData);
    values.push(packageId);

    const query = `UPDATE package SET ${fields} WHERE ID = ?`;

    await pool.execute(query, values);
    res.json({ message: 'Package updated successfully' });
  } catch (error) {
    console.error('Update package error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete package (Admin only)
app.delete('/api/packages/:id', authenticateToken, authorizeRole('Admin'), async (req, res) => {
  try {
    const packageId = req.params.id;

    // First check if the package exists
    const checkQuery = 'SELECT ID, Packagecode FROM package WHERE ID = ?';
    const [existingPackage] = await pool.execute(checkQuery, [packageId]);

    if (existingPackage.length === 0) {
      return res.status(404).json({ message: 'Package not found' });
    }

    // Check if package is currently borrowed (optional check for data integrity)
    const borrowCheckQuery = 'SELECT ID FROM borrow_history WHERE package_id = ? AND return_status NOT IN (\'Returned\', \'Returned with Remarks\')';
    const [activeBorrows] = await pool.execute(borrowCheckQuery, [packageId]);

    if (activeBorrows.length > 0) {
      return res.status(400).json({ message: 'Cannot delete package that is currently borrowed' });
    }

    // Delete the package
    const deleteQuery = 'DELETE FROM package WHERE ID = ?';
    const [result] = await pool.execute(deleteQuery, [packageId]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Package not found' });
    }

    res.json({
      message: 'Package deleted successfully',
      deletedPackage: existingPackage[0].Packagecode
    });

  } catch (error) {
    console.error('Delete package error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.get('/api/verifiers', authenticateToken, async (req, res) => {
  try {
    const [verifiers] = await pool.execute(
      'SELECT ID, Username, Email FROM user WHERE Role = ?',
      ['Technician']
    );
    res.json(verifiers);
  } catch (error) {
    console.error('Get verifiers error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/api/borrow', authenticateToken, authorizeRole('Admin', 'Engineer'), async (req, res) => {
  try {
    const { packageId, verifierId } = req.body;
    const borrowerId = req.user.id;

    // Single optimized query to check package availability
    const [packageInfo] = await pool.execute(
      'SELECT * FROM package WHERE ID = ? AND `MATERIAL AT ENG ROOM` = \'YES\'',
      [packageId]
    );

    if (packageInfo.length === 0) {
      return res.status(400).json({ message: 'Package not available for borrowing' });
    }

    const dueDate = new Date();
    dueDate.setHours(dueDate.getHours() + 24);

    await pool.execute(
      'UPDATE package SET `MATERIAL AT ENG ROOM` = \'NO\' WHERE ID = ?',
      [packageId]
    );

    const [result] = await pool.execute(
      `INSERT INTO borrow_history (Package_ID, Borrower_ID, Verifier_ID, due_at, expected_samples, return_status)
       VALUES (?, ?, ?, ?, ?, 'In Progress')`,
      [packageId, borrowerId, verifierId, dueDate, packageInfo[0].TotalSample]
    );

    const [borrower] = await pool.execute('SELECT * FROM user WHERE ID = ?', [borrowerId]);
    const [verifier] = await pool.execute('SELECT * FROM user WHERE ID = ?', [verifierId]);

    const borrowerEmail = {
      from: process.env.EMAIL_USER,
      to: borrower[0].Email,
      subject: 'Package Borrowed Successfully',
      html: `
        <h3>Package Borrowed</h3>
        <p>You have successfully borrowed package: ${packageInfo[0].Packagecode}</p>
        <p>Due date: ${dueDate.toLocaleString()}</p>
        <p>Please return within 24 hours.</p>
      `
    };

    const verifierEmail = {
      from: process.env.EMAIL_USER,
      to: verifier[0].Email,
      subject: 'New Package to Verify',
      html: `
        <h3>Package Verification Assignment</h3>
        <p>You have been assigned to verify package: ${packageInfo[0].Packagecode}</p>
        <p>Borrowed by: ${borrower[0].Username}</p>
        <p>Due date: ${dueDate.toLocaleString()}</p>
      `
    };

    // Send emails asynchronously without blocking the response
    if (process.env.EMAIL_USER) {
      // Fire and forget - don't await the email sending
      Promise.all([
        transporter.sendMail(borrowerEmail),
        transporter.sendMail(verifierEmail)
      ]).catch(error => {
        console.error('Email sending error:', error);
      });
    }

    // Respond immediately without waiting for emails
    res.json({ message: 'Package borrowed successfully', borrowId: result.insertId });
  } catch (error) {
    console.error('Borrow error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.get('/api/borrow-history', authenticateToken, async (req, res) => {
  try {
    let query = `
      SELECT bh.*, p.Packagecode, p.Packagedescription,
             b.Username as BorrowerName, v.Username as VerifierName
      FROM borrow_history bh
      JOIN package p ON bh.Package_ID = p.ID
      JOIN user b ON bh.Borrower_ID = b.ID
      JOIN user v ON bh.Verifier_ID = v.ID
    `;

    const params = [];

    if (req.user.role === 'Engineer') {
      query += ' WHERE bh.Borrower_ID = ?';
      params.push(req.user.id);
    } else if (req.user.role === 'Technician') {
      query += ' WHERE bh.Verifier_ID = ?';
      params.push(req.user.id);
    }

    query += ' ORDER BY bh.borrowed_at DESC';

    const [history] = await pool.execute(query, params);
    res.json(history);
  } catch (error) {
    console.error('Get borrow history error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/api/return/:borrowId', authenticateToken, async (req, res) => {
  try {
    const borrowId = req.params.borrowId;

    const [borrowInfo] = await pool.execute(
      'SELECT * FROM borrow_history WHERE ID = ? AND Borrower_ID = ?',
      [borrowId, req.user.id]
    );

    if (borrowInfo.length === 0) {
      return res.status(404).json({ message: 'Borrow record not found' });
    }

    await pool.execute(
      'UPDATE borrow_history SET return_status = \'Pending\', returned_at = NOW() WHERE ID = ?',
      [borrowId]
    );

    res.json({ message: 'Return initiated, waiting for verification' });
  } catch (error) {
    console.error('Return error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/api/verify-return/:borrowId', authenticateToken, authorizeRole('Technician'), async (req, res) => {
  try {
    const borrowId = req.params.borrowId;
    const { returnedSamples, justification } = req.body;

    const [borrowInfo] = await pool.execute(
      'SELECT * FROM borrow_history WHERE ID = ? AND Verifier_ID = ?',
      [borrowId, req.user.id]
    );

    if (borrowInfo.length === 0) {
      return res.status(404).json({ message: 'Verification record not found' });
    }

    const expectedSamples = borrowInfo[0].expected_samples;
    const status = parseInt(returnedSamples) === expectedSamples ? 'Returned' : 'Returned with Remarks';

    await pool.execute(
      'UPDATE borrow_history SET returned_samples = ?, justification = ?, return_status = ? WHERE ID = ?',
      [returnedSamples, justification, status, borrowId]
    );

    await pool.execute(
      'UPDATE package SET `MATERIAL AT ENG ROOM` = \'YES\' WHERE ID = ?',
      [borrowInfo[0].Package_ID]
    );

    // Send response immediately
    res.json({ message: 'Return verified successfully' });

    // Send emails asynchronously in the background (don't await)
    if (status === 'Returned with Remarks') {
      setImmediate(async () => {
        try {
          const [admins] = await pool.execute('SELECT Email FROM user WHERE Role = ?', ['Admin']);

          if (process.env.EMAIL_USER && admins.length > 0) {
            // Send all emails concurrently instead of sequentially
            const emailPromises = admins.map(admin => {
              const adminEmail = {
                from: process.env.EMAIL_USER,
                to: admin.Email,
                subject: 'Package Returned with Remarks',
                html: `
                  <h3>Package Return Alert</h3>
                  <p>Package returned with discrepancies:</p>
                  <p>Expected samples: ${expectedSamples}</p>
                  <p>Returned samples: ${returnedSamples}</p>
                  <p>Justification: ${justification}</p>
                `
              };
              return transporter.sendMail(adminEmail);
            });

            await Promise.all(emailPromises);
            console.log(`Sent return discrepancy notifications to ${admins.length} admins`);
          }
        } catch (emailError) {
          console.error('Error sending admin notification emails:', emailError);
          // Don't throw - this is background processing
        }
      });
    }
  } catch (error) {
    console.error('Verify return error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

cron.schedule('0 */2 * * *', async () => {
  try {
    const reminderTime = new Date();
    reminderTime.setHours(reminderTime.getHours() + 2);

    const [overdueItems] = await pool.execute(
      `SELECT bh.*, u.Email, p.Packagecode
       FROM borrow_history bh
       JOIN user u ON bh.Borrower_ID = u.ID
       JOIN package p ON bh.Package_ID = p.ID
       WHERE bh.due_at <= ? AND bh.return_status = 'In Progress'`,
      [reminderTime]
    );

    for (const item of overdueItems) {
      const reminderEmail = {
        from: process.env.EMAIL_USER,
        to: item.Email,
        subject: 'Package Return Reminder',
        html: `
          <h3>Return Reminder</h3>
          <p>Please return package: ${item.Packagecode}</p>
          <p>Due in 2 hours or overdue</p>
        `
      };

      if (process.env.EMAIL_USER) {
        await transporter.sendMail(reminderEmail);
      }
    }
  } catch (error) {
    console.error('Reminder cron error:', error);
  }
});

// For Vercel deployment
if (process.env.VERCEL) {
  module.exports = app;
} else {
  // For local development
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}