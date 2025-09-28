# Storage Management System

A comprehensive web application for managing storage inventory with role-based access control, borrowing system, and email notifications.

## Features

### User Roles & Permissions
- **Admin**: Full access - can borrow, return, verify returns, and edit packages
- **Engineer**: Can borrow and return packages but cannot verify returns
- **Technician**: Can only verify returns, cannot borrow or return packages

### Core Functionality
1. **Login System**: Role-based authentication
2. **Dashboard**: Package inventory with advanced filtering
3. **Add Items**: Complete package entry with auto-calculation
4. **Borrow System**: Package borrowing with verifier assignment
5. **Return Management**: Return tracking and verification
6. **Email Notifications**: Automated emails for borrowing, returns, and reminders

## Installation

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd Storage-Management-System
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Environment Setup**:
   - The `.env` file is already configured with database and email settings
   - Update email credentials if needed:
     ```
     EMAIL_USER=your-email@gmail.com
     EMAIL_PASS=your-app-password
     ```

4. **Database Setup**:
   - The application connects to the MySQL database specified in the connection string
   - Database: `mysql://avnadmin:AVNS_0ATKXC8sc7tmTtr6eGs@mysql-3360b0d4-midanish2k-cba9.j.aivencloud.com:27529/defaultdb?ssl-mode=REQUIRED`

5. **Start the application**:
   ```bash
   npm start
   ```

6. **Access the application**:
   - Open your browser and go to `http://localhost:3000`

## Usage

### Login Credentials
Use any email from the user table with the username as password:

Example users:
- **Admin**:
  - Email: `iqmal.hasnan@nxp.com` | Password: `Iqmal`
  - Email: `suki.sukhdevsingh@nxp.com` | Password: `Suki`
- **Engineer**:
  - Email: `erica.cheah@nxp.com` | Password: `Erica`
  - Email: `huga.veeramani@nxp.com` | Password: `Huga`
  - Email: `asyraf.mohdjaafar@nxp.com` | Password: `Asyraf`
  - Email: `atif.sapie@nxp.com` | Password: `Atif`
  - Email: `munhin.lay_1@nxp.com` | Password: `Mun`
- **Technician**:
  - Email: `masrupa.kamarudin@nxp.com` | Password: `Masrupa`
  - Email: `nurul.husna.othman@nxp.com` | Password: `Husna`
  - Email: `zulkifli.mokhtar@nxp.com` | Password: `Zulkifli`
  - Email: `nurul.wafah.shoid@nxp.com` | Password: `Nurul`
  - Email: `nurhayati.mohdhamzah@nxp.com` | Password: `Nurhayati`
  - Email: `firdaus.abdulaziz@nxp.com` | Password: `Firdaus`

### Dashboard Features
- **Package Table**: View all packages with complete details
- **Filtering**: Filter by package code, category, shift, and availability
- **Actions**: Edit (Admin only) and Borrow (Admin/Engineer only)

### Adding New Packages
1. Go to "Add Item" tab
2. Fill in all required fields:
   - Package Code
   - Temporary Cabinet (format: CX-SXX, e.g., C1-S01)
   - Category and Shift
   - Defect counts for all categories
3. Total samples are auto-calculated
4. Submit to add to inventory

### Borrowing Process
1. Click "Borrow" button on available packages
2. Select a verifier (Technician role)
3. Submit borrowing request
4. Email notifications sent to borrower and verifier
5. Package becomes unavailable for borrowing

### Return Process
1. **For Borrowers**: Go to "Return Items" tab, click "Return" on borrowed items
2. **For Verifiers**: Review returned items, input actual returned quantity
3. If quantities don't match, provide justification
4. System updates package availability and sends notifications

### Email Notifications
- **Borrow confirmation**: Sent to borrower and verifier
- **Return reminders**: Sent 2 hours before 24-hour deadline
- **Return discrepancies**: Sent to admins when returned quantity differs

## Database Structure

### Main Tables
- **user**: User accounts with roles and permissions
- **package**: Package inventory with detailed defect counts
- **borrow_history**: Tracking of all borrowing transactions

### Key Fields
- **TotalSample**: Auto-calculated sum of all defect counts
- **MATERIAL AT ENG ROOM**: Availability status (YES/NO)
- **return_status**: In Progress → Approved → Returned/Returned with Remarks

## Technical Stack
- **Backend**: Node.js, Express.js
- **Database**: MySQL
- **Frontend**: Vanilla JavaScript, Bootstrap 5
- **Email**: Nodemailer with Gmail SMTP
- **Authentication**: JWT tokens
- **Scheduling**: Node-cron for reminder emails

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login

### Packages
- `GET /api/packages` - Get all packages
- `POST /api/packages` - Add new package
- `PUT /api/packages/:id` - Update package (Admin only)
- `GET /api/packages/options` - Get filter options

### Borrowing
- `GET /api/verifiers` - Get list of technicians
- `POST /api/borrow` - Borrow a package
- `GET /api/borrow-history` - Get borrowing history
- `POST /api/return/:borrowId` - Return a package
- `POST /api/verify-return/:borrowId` - Verify return

## Security Features
- JWT token authentication
- Role-based access control
- Rate limiting
- Helmet security headers
- Input validation
- SQL injection protection

## Scheduled Tasks
- **Email Reminders**: Every 2 hours, checks for packages due within 2 hours
- **Overdue Notifications**: Automatic notifications for overdue items

## Troubleshooting

### Common Issues
1. **Email not working**: Check Gmail app password and SMTP settings
2. **Database connection**: Verify connection string and SSL settings
3. **CORS errors**: Ensure frontend is served from the same domain

### Development Mode
```bash
npm run dev  # Uses nodemon for auto-restart
```

### Production Deployment
1. Set `NODE_ENV=production` in .env
2. Configure proper email credentials
3. Use process manager like PM2
4. Set up HTTPS with proper certificates

## Support
For issues and questions, check the database structure in `storage.sql` and refer to the API endpoints in `server.js`.