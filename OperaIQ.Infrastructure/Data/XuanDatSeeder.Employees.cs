using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Identity;
using OperaIQ.Domain.Entities;
using OperaIQ.Domain.Enums;
using DTaskStatus = OperaIQ.Domain.Enums.TaskStatus;

namespace OperaIQ.Infrastructure.Data
{
    public static partial class XuanDatSeeder
    {
        // ---------------- Định nghĩa 100 nhân sự ----------------
        // Cột: code | fullname | email-prefix | phone | deptKey | jobTitle | managerCode |
        //      hireDate | status | years | score | rbacRole | primarySkills | certificates
        private static readonly EmployeeSpec[] Employees = new[]
        {
            // ----- Ban Giám đốc & Giám đốc khối (6) -----
            E("XD-0001","Trần Xuân Đạt","dat.tran","0903111001","BGD","Tổng Giám đốc",null,"02/03/2009",18,98,"CEO",
                P("Quản lý dự án","Đàm phán khách hàng","Tư vấn giải pháp"), C("PMP","DBA Harvard")),
            E("XD-0002","Lê Quốc Hưng","hung.le","0903111002","BGD","Phó TGĐ Kinh doanh","XD-0001","15/06/2010",16,93,"Director",
                P("Đàm phán khách hàng","Tư vấn giải pháp","Đấu thầu EPC"), C("PMP","Schneider PSE")),
            E("XD-0003","Nguyễn Hoàng Anh","anh.nguyen","0903111003","BGD","Phó TGĐ Kỹ thuật","XD-0001","03/09/2011",15,95,"Director",
                P("PLC Mitsubishi","SCADA WinCC","Quản lý dự án"), C("PMP","Mitsubishi Certified Engineer")),
            E("XD-0004","Lý Thu Hà","ha.ly","0903111004","BGD","Giám đốc Vận hành","XD-0001","12/01/2014",13,90,"Director",
                P("Quản lý dự án","Quản lý kho – ERP"), C("PMP")),
            E("XD-0005","Nguyễn Thị Bích Ngọc","ngoc.nguyen","0903111005","BGD","Giám đốc Tài chính","XD-0001","20/05/2013",14,92,"Director",
                P("Kế toán quản trị","Thuế & IFRS"), C("CPA Việt Nam","ACCA")),
            E("XD-0006","Mai Thị Lan Anh","lananh.mai","0903111006","BGD","Giám đốc Nhân sự","XD-0001","04/08/2015",12,88,"Director",
                P("Đào tạo nội bộ","Quản lý dự án"), C("SHRM-CP")),

            // ----- Trưởng phòng (9) -----
            E("XD-0007","Phan Thị Mỹ Hạnh","hanh.phan","0903111007","KD-MN","Trưởng phòng KD Miền Nam","XD-0002","09/02/2012",14,88,"Manager",
                P("Đàm phán khách hàng","Tư vấn giải pháp"), C("Schneider PSE")),
            E("XD-0008","Đỗ Mạnh Cường","cuong.do","0903111008","KD-MB","Trưởng phòng KD Miền Bắc","XD-0002","16/04/2014",12,86,"Manager",
                P("Đàm phán khách hàng","Tư vấn giải pháp"), C("Schneider PSE")),
            E("XD-0009","Vũ Thanh Tùng","tung.vu","0903111009","KD-DA","Trưởng phòng KD Dự án","XD-0002","22/07/2015",11,87,"Manager",
                P("Đấu thầu EPC","Quản lý dự án"), C("PMP")),
            E("XD-0010","Bùi Đình Khánh","khanh.bui","0903111010","AUTO","Trưởng phòng Tự động hoá","XD-0003","11/11/2013",13,91,"Manager",
                P("PLC Mitsubishi","SCADA WinCC","Biến tần Mitsubishi"), C("Mitsubishi Certified Engineer","Siemens TIA Portal")),
            E("XD-0011","Trương Văn Sơn","son.truong","0903111011","EPC","Trưởng phòng Dự án Kỹ thuật","XD-0003","18/03/2014",12,89,"Manager",
                P("Quản lý dự án","AutoCAD Electrical","ETAP"), C("PMP")),
            E("XD-0012","Phạm Quốc Toản","toan.pham","0903111012","MAINT","Trưởng phòng Bảo trì","XD-0003","27/05/2016",10,85,"Manager",
                P("PLC Mitsubishi","Biến tần ABB"), C("Mitsubishi MELSERVO")),
            E("XD-0013","Hoàng Văn Bằng","bang.hoang","0903111013","WH","Trưởng phòng Kho vận","XD-0004","13/10/2015",11,82,"Manager",
                P("Quản lý kho – ERP"), C("CILT Logistics")),
            E("XD-0014","Đặng Thuý Liên","lien.dang","0903111014","PUR","Trưởng phòng Mua hàng","XD-0004","02/02/2017",9,84,"Manager",
                P("Đàm phán khách hàng","Quản lý kho – ERP"), C("CIPS L4")),
            E("XD-0015","Trịnh Minh Đức","duc.trinh","0903111015","FIN","Trưởng phòng Tài chính","XD-0005","25/06/2014",12,87,"Manager",
                P("Kế toán quản trị","Thuế & IFRS"), C("CPA Việt Nam")),

            // ----- Trưởng phòng khối hỗ trợ (4) -----
            E("XD-0016","Cao Khánh Linh","linh.cao","0903111016","HR","Trưởng phòng Nhân sự","XD-0006","09/09/2017",9,83,"Manager",
                P("Đào tạo nội bộ"), C("SHRM-CP")),
            E("XD-0017","Trần Diệu My","my.tran","0903111017","MKT","Trưởng phòng Marketing","XD-0006","14/12/2018",8,82,"Manager",
                P("Tư vấn giải pháp"), C("Google Ads Pro")),
            E("XD-0018","Lưu Hữu Nghĩa","nghia.luu","0903111018","IT","Trưởng phòng IT","XD-0006","03/03/2019",9,86,"Manager",
                P("Quản trị mạng","Microsoft 365 / Azure"), C("CCNA","AZ-104")),
            E("XD-0019","Nguyễn Tấn Phát","phat.nguyen","0903111019","QC","Trưởng phòng QA/QC","XD-0006","17/01/2020",7,80,"Manager",
                P("Quản lý dự án"), C("ISO 9001 Lead Auditor")),

            // ----- Team Lead (11) -----
            E("XD-0020","Lâm Hữu Trí","tri.lam","0903111020","KD-MN","Team Lead – Công nghiệp","XD-0007","04/05/2017",9,83,"TeamLeader",
                P("Tư vấn giải pháp","Đàm phán khách hàng"), C("Schneider PSE")),
            E("XD-0021","Đoàn Thanh Vy","vy.doan","0903111021","KD-MN","Team Lead – KCN","XD-0007","21/06/2018",8,82,"TeamLeader",
                P("Đàm phán khách hàng"), C()),
            E("XD-0022","Hồ Quang Vinh","vinh.ho","0903111022","KD-MB","Team Lead – Hà Nội","XD-0008","08/08/2018",8,84,"TeamLeader",
                P("Đàm phán khách hàng","Tư vấn giải pháp"), C("Schneider PSE")),
            E("XD-0023","Nguyễn Mạnh Hà","ha.nguyen2","0903111023","AUTO","Team Lead – PLC","XD-0010","02/02/2016",10,92,"TeamLeader",
                P("PLC Mitsubishi","PLC Siemens","SCADA WinCC"), C("Mitsubishi Certified Engineer","PMP")),
            E("XD-0024","Vũ Tuấn Phong","phong.vu","0903111024","AUTO","Team Lead – SCADA/HMI","XD-0010","19/04/2017",9,90,"TeamLeader",
                P("SCADA WinCC","SCADA Wonderware","HMI Design"), C("Siemens WinCC Pro")),
            E("XD-0025","Đinh Trung Kiên","kien.dinh","0903111025","AUTO","Team Lead – Drive & Motion","XD-0010","11/09/2018",8,88,"TeamLeader",
                P("Biến tần Mitsubishi","Biến tần ABB","Servo Motion"), C("ABB Drive Specialist")),
            E("XD-0026","Nguyễn Văn Bảo","bao.nguyen","0903111026","EPC","Team Lead – Thiết kế","XD-0011","03/03/2017",9,87,"TeamLeader",
                P("AutoCAD Electrical","Revit MEP","ETAP"), C("EPLAN Certified")),
            E("XD-0027","Phạm Hồng Sơn","son.pham","0903111027","EPC","Team Lead – Site","XD-0011","15/07/2018",8,85,"TeamLeader",
                P("Quản lý dự án","Tủ MCC – MSB"), C("ATLĐ nhóm 4")),
            E("XD-0028","Trần Anh Quân","quan.tran","0903111028","MAINT","Team Lead – Field Service","XD-0012","22/10/2019",7,84,"TeamLeader",
                P("PLC Mitsubishi","Biến tần ABB"), C("Mitsubishi MELSERVO")),
            E("XD-0029","Lê Hữu Thịnh","thinh.le","0903111029","WH","Team Lead – Logistics","XD-0013","14/02/2020",6,80,"TeamLeader",
                P("Quản lý kho – ERP"), C("CILT Logistics")),
            E("XD-0030","Nguyễn Thuý An","an.nguyen","0903111030","FIN","Team Lead – Kế toán","XD-0015","06/06/2018",8,83,"TeamLeader",
                P("Kế toán quản trị","Thuế & IFRS"), C("CPA Việt Nam")),

            // ----- Phòng Tự động hoá – PLC (5) -----
            E("XD-0031","Nguyễn Văn An","an.nguyen2","0903111031","AUTO","Senior PLC Engineer","XD-0023","12/03/2018",8,89,"Senior",
                P("PLC Mitsubishi","Biến tần Mitsubishi","SCADA WinCC"), C("Mitsubishi MELSEC")),
            E("XD-0032","Trần Bảo Nam","nam.tran","0903111032","AUTO","PLC Engineer","XD-0023","02/08/2020",6,82,"Staff",
                P("PLC Mitsubishi","PLC Siemens"), C("Mitsubishi MELSEC")),
            E("XD-0033","Phạm Thuỳ Trang","trang.pham","0903111033","AUTO","PLC Engineer","XD-0023","17/05/2021",5,78,"Staff",
                P("PLC Mitsubishi","HMI Design"), C()),
            E("XD-0034","Lê Hoàng Phúc","phuc.le","0903111034","AUTO","Junior PLC Engineer","XD-0023","08/01/2023",3,72,"Staff",
                P("PLC Mitsubishi"), C()),
            E("XD-0035","Vũ Thái Bình","binh.vu","0903111035","AUTO","Intern PLC","XD-0023","15/03/2026",0,62,"Intern",
                P("PLC Mitsubishi"), C(), EmploymentStatus.Probation),

            // ----- Phòng Tự động hoá – SCADA/HMI (4) -----
            E("XD-0036","Nguyễn Trí Dũng","dung.nguyen","0903111036","AUTO","Senior SCADA Engineer","XD-0024","04/04/2019",7,87,"Senior",
                P("SCADA WinCC","SCADA Citect","HMI Design"), C("Siemens Certified")),
            E("XD-0037","Đặng Bảo Châu","chau.dang","0903111037","AUTO","SCADA Engineer","XD-0024","21/06/2020",6,81,"Staff",
                P("SCADA WinCC","HMI Design"), C()),
            E("XD-0038","Trần Khánh Chi","chi.tran","0903111038","AUTO","HMI Designer","XD-0024","30/09/2021",5,76,"Staff",
                P("HMI Design","SCADA Wonderware"), C(), EmploymentStatus.Maternity),
            E("XD-0039","Bùi Quang Hải","hai.bui","0903111039","AUTO","Junior SCADA","XD-0024","12/07/2024",2,70,"Staff",
                P("SCADA WinCC"), C()),

            // ----- Phòng Tự động hoá – Drive (2) -----
            E("XD-0040","Nguyễn Hữu Tài","tai.nguyen","0903111040","AUTO","Senior Drive Engineer","XD-0025","16/11/2019",7,86,"Senior",
                P("Biến tần ABB","Biến tần Mitsubishi","Servo Motion"), C("ABB Drive Specialist")),
            E("XD-0041","Lý Đức Anh","anh.ly","0903111041","AUTO","Drive Engineer","XD-0025","02/02/2022",4,79,"Staff",
                P("Biến tần ABB","Servo Motion"), C()),

            // ----- EPC – Thiết kế (5) -----
            E("XD-0042","Hoàng Anh Tuấn","tuan.hoang","0903111042","EPC","Senior Electrical Designer","XD-0026","10/03/2018",8,86,"Senior",
                P("AutoCAD Electrical","Revit MEP","ETAP"), C("EPLAN Certified")),
            E("XD-0043","Phan Minh Khôi","khoi.phan","0903111043","EPC","Electrical Designer","XD-0026","25/09/2020",6,80,"Staff",
                P("AutoCAD Electrical","EPLAN"), C()),
            E("XD-0044","Đỗ Thanh Mai","mai.do","0903111044","EPC","Designer (AutoCAD/Revit MEP)","XD-0026","18/04/2022",4,75,"Staff",
                P("AutoCAD Electrical","Revit MEP"), C()),
            E("XD-0045","Trần Quang Huy","huy.tran","0903111045","EPC","Junior Designer","XD-0026","05/08/2024",2,68,"Staff",
                P("AutoCAD Electrical"), C()),
            E("XD-0046","Nguyễn Phước Lộc","loc.nguyen","0903111046","EPC","BIM Coordinator","XD-0026","02/12/2022",4,78,"Staff",
                P("Revit MEP","AutoCAD Electrical"), C()),

            // ----- EPC – Site (5) -----
            E("XD-0047","Lê Quang Vinh","vinh.le","0903111047","EPC","Site Manager","XD-0027","14/05/2017",9,88,"Senior",
                P("Quản lý dự án","Tủ MCC – MSB"), C("PMP","ATLĐ nhóm 4")),
            E("XD-0048","Bùi Tấn Lực","luc.bui","0903111048","EPC","Site Engineer","XD-0027","11/11/2019",6,82,"Senior",
                P("Tủ MCC – MSB"), C("ATLĐ nhóm 4")),
            E("XD-0049","Nguyễn Tiến Đạt","dat.nguyen2","0903111049","EPC","Site Engineer","XD-0027","03/03/2021",5,78,"Staff",
                P("Tủ MCC – MSB"), C()),
            E("XD-0050","Phạm Văn Thái","thai.pham","0903111050","EPC","Commissioning Engineer","XD-0027","27/07/2022",4,76,"Staff",
                P("PLC Mitsubishi","Tủ MCC – MSB"), C()),
            E("XD-0051","Trần Xuân Quyết","quyet.tran","0903111051","EPC","Field Technician","XD-0027","12/09/2023",3,71,"Staff",
                P("Tủ MCC – MSB"), C()),

            // ----- Bảo trì – Dịch vụ (8) -----
            E("XD-0052","Đoàn Nhật Minh","minh.doan","0903111052","MAINT","Senior Service Engineer","XD-0028","02/01/2018",8,88,"Senior",
                P("PLC Mitsubishi","Biến tần ABB","SCADA WinCC"), C("Mitsubishi MELSERVO")),
            E("XD-0053","Hồ Tấn Đạt","dat.ho","0903111053","MAINT","Service Engineer (PLC)","XD-0028","14/04/2020",6,82,"Staff",
                P("PLC Mitsubishi"), C("Mitsubishi MELSEC")),
            E("XD-0054","Trương Quốc Bảo","bao.truong","0903111054","MAINT","Service Engineer (Drive)","XD-0028","25/10/2020",6,81,"Staff",
                P("Biến tần ABB","Biến tần Mitsubishi"), C()),
            E("XD-0055","Nguyễn Đăng Khoa","khoa.nguyen","0903111055","MAINT","Service Engineer (SCADA)","XD-0028","19/02/2021",5,79,"Staff",
                P("SCADA WinCC"), C()),
            E("XD-0056","Lưu Bá Khánh","khanh.luu","0903111056","MAINT","Junior Technician","XD-0028","03/03/2023",3,71,"Staff",
                P("PLC Mitsubishi"), C()),
            E("XD-0057","Trần Hữu Toàn","toan.tran","0903111057","MAINT","Field Technician","XD-0028","22/05/2023",3,70,"Staff",
                P("Tủ MCC – MSB"), C()),
            E("XD-0058","Lê Anh Thư","thu.le","0903111058","MAINT","Service Coordinator","XD-0028","16/07/2022",4,75,"Staff",
                P("Quản lý dự án"), C()),
            E("XD-0059","Nguyễn Quang Vũ","vu.nguyen","0903111059","MAINT","Helpdesk – Hotline 24/7","XD-0028","10/08/2024",2,68,"Staff",
                P("PLC Mitsubishi"), C()),

            // ----- Kinh doanh Miền Nam (10) -----
            E("XD-0060","Lê Hữu Phước","phuoc.le","0903111060","KD-MN","Senior Account Manager","XD-0020","03/09/2018",8,85,"Senior",
                P("Đàm phán khách hàng","Tư vấn giải pháp"), C("Schneider PSE")),
            E("XD-0061","Vũ Thanh Hằng","hang.vu","0903111061","KD-MN","Account Manager","XD-0020","22/02/2020",6,80,"Staff",
                P("Đàm phán khách hàng"), C()),
            E("XD-0062","Phạm Quốc Hưng","hung.pham","0903111062","KD-MN","Sales Engineer","XD-0020","11/06/2021",5,77,"Staff",
                P("Tư vấn giải pháp","PLC Mitsubishi"), C()),
            E("XD-0063","Trần Hoài Phương","phuong.tran","0903111063","KD-MN","Sales Executive","XD-0020","04/04/2023",3,72,"Staff",
                P("Đàm phán khách hàng"), C()),
            E("XD-0064","Nguyễn Bảo Trâm","tram.nguyen","0903111064","KD-MN","Sales Executive","XD-0020","15/01/2024",2,68,"Staff",
                P("Đàm phán khách hàng"), C()),
            E("XD-0065","Đinh Quốc Thái","thai.dinh","0903111065","KD-MN","Sales – KCN VSIP","XD-0021","27/03/2019",7,82,"Staff",
                P("Tư vấn giải pháp"), C()),
            E("XD-0066","Lý Mỹ Tiên","tien.ly","0903111066","KD-MN","Sales – KCN Sóng Thần","XD-0021","10/10/2021",5,76,"Staff",
                P("Đàm phán khách hàng"), C()),
            E("XD-0067","Hồ Quốc Tuấn","tuan.ho","0903111067","KD-MN","Sales Engineer (KCN)","XD-0021","12/02/2022",4,75,"Staff",
                P("Tư vấn giải pháp","PLC Mitsubishi"), C()),
            E("XD-0068","Trịnh Anh Khoa","khoa.trinh","0903111068","KD-MN","Sales Executive","XD-0021","18/08/2023",3,70,"Staff",
                P("Đàm phán khách hàng"), C()),
            E("XD-0069","Nguyễn Phương Thảo","thao.nguyen","0903111069","KD-MN","Sales Admin","XD-0007","25/05/2020",6,74,"Staff",
                P("Quản lý kho – ERP"), C()),

            // ----- Kinh doanh Miền Bắc (8) -----
            E("XD-0070","Phạm Quốc Việt","viet.pham","0903111070","KD-MB","Senior Account Manager","XD-0022","04/04/2017",9,84,"Senior",
                P("Đàm phán khách hàng","Tư vấn giải pháp"), C("Schneider PSE")),
            E("XD-0071","Nguyễn Hữu Thắng","thang.nguyen","0903111071","KD-MB","Sales Engineer","XD-0022","02/02/2019",7,80,"Staff",
                P("Tư vấn giải pháp","PLC Mitsubishi"), C()),
            E("XD-0072","Đặng Mai Phương","phuong.dang","0903111072","KD-MB","Sales Executive","XD-0022","16/09/2021",4,75,"Staff",
                P("Đàm phán khách hàng"), C()),
            E("XD-0073","Vũ Hoàng Long","long.vu","0903111073","KD-MB","Sales – KCN Bắc Ninh","XD-0022","22/03/2022",4,74,"Staff",
                P("Đàm phán khách hàng"), C()),
            E("XD-0074","Bùi Tuấn Anh","anh.bui","0903111074","KD-MB","Sales – KCN Hải Phòng","XD-0022","14/06/2023",3,71,"Staff",
                P("Đàm phán khách hàng"), C()),
            E("XD-0075","Trần Mai Hương","huong.tran","0903111075","KD-MB","Sales Admin","XD-0008","30/07/2022",4,72,"Staff",
                P("Quản lý kho – ERP"), C()),
            E("XD-0076","Hoàng Tiến Dũng","dung.hoang","0903111076","KD-MB","Sales Engineer","XD-0008","05/05/2024",2,69,"Staff",
                P("Tư vấn giải pháp","PLC Mitsubishi"), C()),
            E("XD-0077","Lý Thanh Tâm","tam.ly","0903111077","KD-MB","Sales Executive","XD-0008","18/02/2025",1,66,"Staff",
                P("Đàm phán khách hàng"), C()),

            // ----- Kinh doanh Dự án (6) -----
            E("XD-0078","Nguyễn Hồng Phúc","phuc.nguyen","0903111078","KD-DA","Senior Project Sales","XD-0009","09/09/2018",8,87,"Senior",
                P("Đấu thầu EPC","Quản lý dự án"), C("PMP")),
            E("XD-0079","Trần Quốc Hùng","hung.tran","0903111079","KD-DA","Project Sales Engineer","XD-0009","23/04/2020",6,81,"Staff",
                P("Đấu thầu EPC","Tư vấn giải pháp"), C()),
            E("XD-0080","Phạm Lê Mai","mai.pham","0903111080","KD-DA","Bidding Specialist","XD-0009","11/01/2021",5,79,"Staff",
                P("Đấu thầu EPC"), C()),
            E("XD-0081","Đỗ Tuấn Kiệt","kiet.do","0903111081","KD-DA","Pre-sales Engineer","XD-0009","30/03/2022",4,76,"Staff",
                P("Tư vấn giải pháp","PLC Mitsubishi"), C()),
            E("XD-0082","Vũ Hoàng Yến","yen.vu","0903111082","KD-DA","Pre-sales Engineer","XD-0009","02/02/2024",2,72,"Staff",
                P("Tư vấn giải pháp"), C(), EmploymentStatus.Maternity),
            E("XD-0083","Nguyễn Anh Thư","thu.nguyen","0903111083","KD-DA","Project Coordinator","XD-0009","12/12/2022",4,75,"Staff",
                P("Quản lý dự án"), C()),

            // ----- Kho vận (6) -----
            E("XD-0084","Trần Văn Lâm","lam.tran","0903111084","WH","Warehouse Supervisor","XD-0029","04/04/2018",8,80,"Senior",
                P("Quản lý kho – ERP"), C("CILT Logistics")),
            E("XD-0085","Nguyễn Trọng Hiếu","hieu.nguyen","0903111085","WH","Inventory Officer","XD-0029","22/10/2020",6,76,"Staff",
                P("Quản lý kho – ERP"), C()),
            E("XD-0086","Phan Thanh Bình","binh.phan","0903111086","WH","Logistics Coordinator","XD-0029","14/06/2021",5,74,"Staff",
                P("Quản lý kho – ERP"), C()),
            E("XD-0087","Lê Tấn Phát","phat.le","0903111087","WH","Driver – Forklift","XD-0029","30/08/2022",4,70,"Staff",
                P("Quản lý kho – ERP"), C()),
            E("XD-0088","Hồ Văn Sỹ","sy.ho","0903111088","WH","Warehouse Staff","XD-0029","05/05/2023",3,68,"Staff",
                P("Quản lý kho – ERP"), C()),
            E("XD-0089","Trương Mỹ Linh","linh.truong","0903111089","WH","Logistics Admin","XD-0013","12/01/2024",2,66,"Staff",
                P("Quản lý kho – ERP"), C()),

            // ----- Mua hàng (4) -----
            E("XD-0090","Nguyễn Lê Hùng","hung.nguyen2","0903111090","PUR","Senior Buyer","XD-0014","08/08/2018",8,82,"Senior",
                P("Đàm phán khách hàng","Quản lý kho – ERP"), C("CIPS L4")),
            E("XD-0091","Trần Bích Vân","van.tran","0903111091","PUR","Buyer (CN)","XD-0014","17/03/2021",5,76,"Staff",
                P("Đàm phán khách hàng"), C()),
            E("XD-0092","Lê Tấn Thành","thanh.le","0903111092","PUR","Buyer","XD-0014","24/09/2022",4,74,"Staff",
                P("Đàm phán khách hàng"), C()),
            E("XD-0093","Đặng Hồng Vy","vy.dang","0903111093","PUR","Sourcing Specialist","XD-0014","11/02/2024",2,70,"Staff",
                P("Đàm phán khách hàng"), C()),

            // ----- Tài chính – Kế toán (6) -----
            E("XD-0094","Nguyễn Thuý Hằng","hang.nguyen","0903111094","FIN","Senior Accountant","XD-0030","05/05/2019",7,84,"Senior",
                P("Kế toán quản trị","Thuế & IFRS"), C("CPA Việt Nam")),
            E("XD-0095","Phan Diễm Hương","huong.phan","0903111095","FIN","General Accountant","XD-0030","22/02/2021",5,78,"Staff",
                P("Kế toán quản trị"), C()),
            E("XD-0096","Trần Quốc Khánh","khanh.tran","0903111096","FIN","Tax Accountant","XD-0030","11/06/2022",4,75,"Staff",
                P("Thuế & IFRS"), C()),
            E("XD-0097","Lê Mỹ Duyên","duyen.le","0903111097","FIN","AR/AP Accountant","XD-0030","09/09/2023",3,72,"Staff",
                P("Kế toán quản trị"), C()),
            E("XD-0098","Vũ Hoàng Sơn","son.vu","0903111098","FIN","Treasurer","XD-0015","14/12/2020",6,80,"Senior",
                P("Kế toán quản trị","Thuế & IFRS"), C()),
            E("XD-0099","Đoàn Phương Linh","linh.doan","0903111099","FIN","Accounting Intern","XD-0030","02/03/2026",0,62,"Intern",
                P("Kế toán quản trị"), C(), EmploymentStatus.Probation),

            // ----- HR Generalist (1) -----
            E("XD-0100","Nguyễn Quỳnh Nga","nga.nguyen","0903111100","HR","HR Generalist","XD-0016","20/04/2020",6,78,"Staff",
                P("Đào tạo nội bộ"), C("SHRM-CP")),
        };

        // Helper builder methods để giữ literal phía trên gọn.
        private record EmployeeSpec(
            string Code, string FullName, string EmailPrefix, string Phone,
            string DeptKey, string JobTitle, string? ManagerCode,
            string HireDate, int Years, int Score,
            string RbacRole, string[] PrimarySkills, string[] Certificates,
            EmploymentStatus Status);

        private static EmployeeSpec E(string code, string fn, string em, string ph,
            string dept, string title, string? mgr, string hire, int years, int score,
            string rbac, string[] primary, string[] certs,
            EmploymentStatus status = EmploymentStatus.Active)
            => new(code, fn, em, ph, dept, title, mgr, hire, years, score, rbac, primary, certs, status);

        private static string[] P(params string[] s) => s;
        private static string[] C(params string[] s) => s;

        // ============================================================
        // 6. SEED EMPLOYEES (~100)
        // ============================================================
        private static async Task<Dictionary<string, AppUser>> SeedEmployeesAsync(
            ApplicationDbContext ctx,
            UserManager<AppUser> userManager,
            Guid tenantId,
            Dictionary<string, Department> depts,
            Dictionary<string, Skill> skills)
        {
            var users = new Dictionary<string, AppUser>();

            // Pass 1: tạo user (chưa gán Manager để tránh FK chưa tồn tại)
            foreach (var spec in Employees)
            {
                var email = $"{spec.EmailPrefix}@xuandat.vn";
                var u = new AppUser
                {
                    UserName = email,
                    Email = email,
                    FullName = spec.FullName,
                    PhoneNumber = spec.Phone,
                    EmailConfirmed = true,
                    TenantId = tenantId,
                    DepartmentId = depts[spec.DeptKey].Id,
                    EmployeeCode = spec.Code,
                    JobTitle = spec.JobTitle,
                    HireDate = ParseDate(spec.HireDate),
                    EmploymentStatus = spec.Status,
                    YearsOfExperience = spec.Years,
                    CompetencyScore = spec.Score
                };

                var result = await userManager.CreateAsync(u, DefaultPassword);
                if (!result.Succeeded)
                    throw new Exception($"Không tạo được user {email}: " +
                        string.Join("; ", result.Errors.Select(e => e.Description)));

                // Map RBAC → UserSystemRole
                var sysRole = MapToSystemRole(spec.RbacRole);
                await userManager.AddToRoleAsync(u, sysRole);

                users[spec.Code] = u;
            }

            // Pass 2: gán Manager
            foreach (var spec in Employees)
            {
                if (spec.ManagerCode == null) continue;
                var u = users[spec.Code];
                u.ManagerId = users[spec.ManagerCode].Id;
            }
            await ctx.SaveChangesAsync();

            // Pass 3: skills + certificates + workload snapshot
            var rng = new Random(20260531);
            foreach (var spec in Employees)
            {
                var u = users[spec.Code];

                for (int i = 0; i < spec.PrimarySkills.Length; i++)
                {
                    var skName = spec.PrimarySkills[i];
                    if (!skills.TryGetValue(skName, out var sk)) continue;

                    ctx.EmployeeSkills.Add(new EmployeeSkill
                    {
                        UserId = u.Id,
                        SkillId = sk.Id,
                        IsPrimary = i == 0,
                        Level = ToSkillLevel(spec.Score),
                        Score = Math.Clamp(spec.Score - rng.Next(0, 6), 50, 100),
                        TenantId = tenantId
                    });
                }

                foreach (var cert in spec.Certificates)
                {
                    ctx.EmployeeCertificates.Add(new EmployeeCertificate
                    {
                        UserId = u.Id,
                        Name = cert,
                        Issuer = cert.Contains("Mitsubishi") ? "Mitsubishi Electric"
                               : cert.Contains("Schneider") ? "Schneider Electric"
                               : cert.Contains("Siemens") ? "Siemens"
                               : cert.Contains("ABB") ? "ABB"
                               : cert == "PMP" ? "PMI"
                               : cert == "CCNA" || cert == "AZ-104" ? "Cisco / Microsoft"
                               : "Tổ chức cấp",
                        IssueDate = Today.AddYears(-Math.Min(spec.Years, 5)),
                        TenantId = tenantId
                    });
                }

                // Workload snapshot — bias theo cấp.
                var (taskCount, load, hours) = WorkloadFor(spec.RbacRole, rng);
                ctx.WorkloadSnapshots.Add(new WorkloadSnapshot
                {
                    UserId = u.Id,
                    SnapshotDate = Today,
                    ActiveTaskCount = taskCount,
                    LoadPercent = load,
                    WeeklyHours = hours,
                    Level = load >= 85 ? WorkloadLevel.VeryHigh
                          : load >= 70 ? WorkloadLevel.High
                          : load >= 45 ? WorkloadLevel.Medium
                          : WorkloadLevel.Low,
                    TenantId = tenantId
                });
            }

            await ctx.SaveChangesAsync();
            return users;
        }

        private static string MapToSystemRole(string rbac) => rbac switch
        {
            "CEO" or "Director" => nameof(UserSystemRole.TenantOwner),
            "Manager" or "TeamLeader" => nameof(UserSystemRole.TenantAdmin),
            _ => nameof(UserSystemRole.Employee),
        };

        private static SkillLevel ToSkillLevel(int score) => score switch
        {
            >= 90 => SkillLevel.Expert,
            >= 80 => SkillLevel.Advanced,
            >= 70 => SkillLevel.Intermediate,
            _ => SkillLevel.Beginner,
        };

        private static (int tasks, int load, int hours) WorkloadFor(string rbac, Random rng)
            => rbac switch
            {
                "CEO" => (3, 95, 55),
                "Director" => (4, 80, 50),
                "Manager" => (5, 75, 48),
                "TeamLeader" => (6, 70, 46),
                "Senior" => (5, 65 + rng.Next(0, 15), 44),
                "Staff" => (3 + rng.Next(0, 3), 40 + rng.Next(0, 30), 38 + rng.Next(0, 6)),
                "Intern" => (2, 25 + rng.Next(0, 10), 30),
                _ => (3, 50, 40),
            };

        private static DateTime ParseDate(string dmy)
        {
            var p = dmy.Split('/');
            return new DateTime(int.Parse(p[2]), int.Parse(p[1]), int.Parse(p[0]),
                0, 0, 0, DateTimeKind.Utc);
        }
    }
}
