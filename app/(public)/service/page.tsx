"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import dynamic from "next/dynamic";
import styles from "./Service.module.css";
import PROVINCE_COORDS from "@/data/provinceCoords";

const LocationPicker = dynamic(() => import("@/components/ui/LocationPicker"), { ssr: false });
import TimePicker from "@/components/ui/TimePicker";
import DatePicker from "@/components/ui/DatePicker";

/* ─── Types ─── */
type SubDistrict = { name: string; postalCode: string };
type AddressData = Record<string, Record<string, SubDistrict[]>>;

/* ─── Constants ─── */
const STEPS = [
  { label: "ข้อมูลผู้ร้อง" },
  { label: "ข้อมูลร้านยา" },
  { label: "ข้อมูลเบาะแส" },
];
const TITLE_OPTIONS = ["นาย", "นาง", "นางสาว", "อื่นๆ"];

/* ─── Helpers ─── */
function useAddressCascade(addressData: AddressData) {
  const [province, setProvince] = useState("");
  const [district, setDistrict] = useState("");
  const [subdistrict, setSubdistrict] = useState("");
  const [postalCode, setPostalCode] = useState("");

  const provinces = Object.keys(addressData).sort();
  const districts = province && addressData[province] ? Object.keys(addressData[province]).sort() : [];
  const subDistricts: SubDistrict[] =
    province && district && addressData[province]?.[district]
      ? addressData[province][district]
      : [];

  const handleProvince = (v: string) => {
    setProvince(v);
    setDistrict("");
    setSubdistrict("");
    setPostalCode("");
  };
  const handleDistrict = (v: string) => {
    setDistrict(v);
    setSubdistrict("");
    setPostalCode("");
  };
  const handleSubdistrict = (v: string) => {
    setSubdistrict(v);
    const found = subDistricts.find((s) => s.name === v);
    setPostalCode(found?.postalCode ?? "");
  };

  return {
    province, district, subdistrict, postalCode,
    provinces, districts, subDistricts,
    handleProvince, handleDistrict, handleSubdistrict, setPostalCode,
  };
}

/* ════════════════════════════════════════════ */
export default function Service() {
  const [currentStep, setCurrentStep] = useState(0);
  const stepperRef = useRef<HTMLDivElement>(null);
  const [addressData, setAddressData] = useState<AddressData>({});
  const [isAnonymous, setIsAnonymous] = useState(false);

  /* Load address JSON */
  useEffect(() => {
    fetch("/thaiAddress.json").then((r) => r.json()).then(setAddressData);
  }, []);

  /* ── Step 1 form ── */
  const [s1, setS1] = useState({
    title: "", firstName: "", lastName: "", phone: "", address: "",
  });
  const addr1 = useAddressCascade(addressData);

  /* ── Step 2 form ── */
  const [s2, setS2] = useState({
    shopName: "", shopAddress: "",
    lat: "", lng: "",
    pharmacistFirstName: "", pharmacistLastName: "",
    licenseNo: "", workHoursStart: "", workHoursEnd: "",
  });
  const addr2 = useAddressCascade(addressData);

  /* ── Step 3 form ── */
  const [s3, setS3] = useState({
    foundDate: "", foundTime: "",
    behavior: "",
    consent: "", // "yes" | "no"
  });
  const [evidenceFiles, setEvidenceFiles] = useState<File[]>([]);

  /* ── Map auto-center based on address selection ── */
  const [mapCenter, setMapCenter] = useState<[number, number] | undefined>();
  const [mapZoom, setMapZoom] = useState<number>(13);

  useEffect(() => {
    // Build search query from most specific to least
    const { province, district, subdistrict } = addr2;
    if (!province) return;

    let query = "";
    let zoom = 10;

    if (subdistrict && district) {
      query = `${subdistrict}, ${district}, ${province}, Thailand`;
      zoom = 15;
    } else if (district) {
      query = `${district}, ${province}, Thailand`;
      zoom = 13;
    } else {
      // Province only — use static coords (faster)
      const coords = PROVINCE_COORDS[province];
      if (coords) {
        setMapCenter(coords);
        setMapZoom(10);
      }
      return;
    }

    // Geocode via Nominatim
    const controller = new AbortController();
    fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`,
      { signal: controller.signal, headers: { "Accept-Language": "th" } }
    )
      .then((r) => r.json())
      .then((data) => {
        if (data && data.length > 0) {
          setMapCenter([parseFloat(data[0].lat), parseFloat(data[0].lon)]);
          setMapZoom(zoom);
        }
      })
      .catch(() => {});

    return () => controller.abort();
  }, [addr2.province, addr2.district, addr2.subdistrict]);

  const scrollToTop = () => {
    setTimeout(() => {
      stepperRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  };
  const handleNext = () => { setCurrentStep((p) => Math.min(p + 1, STEPS.length - 1)); scrollToTop(); };
  const handleBack = () => { setCurrentStep((p) => p - 1); scrollToTop(); };

  /* ─── Step Indicator ─── */
  const renderStepper = () => (
    <div ref={stepperRef} className={styles.stepperWrapper}>
      {STEPS.map((step, index) => {
        const isCompleted = index < currentStep;
        const isActive = index === currentStep;
        return (
          <div key={index} className={styles.stepItem}>
            {index !== 0 && (
              <div className={`${styles.connector} ${isCompleted ? styles.connectorDone : ""}`} />
            )}
            <div className={styles.stepCircleWrapper}>
              <div className={`${styles.circle} ${isCompleted ? styles.circleDone : isActive ? styles.circleActive : styles.circleInactive}`}>
                {isCompleted ? (
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M3 8L6.5 11.5L13 5" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : isActive ? <div className={styles.circleDot} /> : null}
              </div>
              <span className={`${styles.stepLabel} ${isActive ? styles.stepLabelActive : ""} ${isCompleted ? styles.stepLabelDone : ""}`}>
                {step.label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );

  /* ─── Address Row (reusable for both steps) ─── */
  const renderAddressRow = (
    hook: ReturnType<typeof useAddressCascade>,
    disabled = false
  ) => (
    <div className={styles.formRow4}>
      <div className={styles.formGroup}>
        <label className={styles.label}>จังหวัด <span className={styles.required}>*</span></label>
        <div className={styles.selectWrapper}>
          <select value={hook.province} onChange={(e) => hook.handleProvince(e.target.value)} className={styles.select} disabled={disabled}>
            <option value="">เลือก</option>
            {hook.provinces.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
          <span className={styles.selectArrow}><svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M6 9L12 15L18 9" stroke="#6b7280" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg></span>
        </div>
      </div>
      <div className={styles.formGroup}>
        <label className={styles.label}>อำเภอ/เขต <span className={styles.required}>*</span></label>
        <div className={styles.selectWrapper}>
          <select value={hook.district} onChange={(e) => hook.handleDistrict(e.target.value)} className={styles.select} disabled={disabled || !hook.province}>
            <option value="">เลือก</option>
            {hook.districts.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
          <span className={styles.selectArrow}><svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M6 9L12 15L18 9" stroke="#6b7280" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg></span>
        </div>
      </div>
      <div className={styles.formGroup}>
        <label className={styles.label}>ตำบล/แขวง <span className={styles.required}>*</span></label>
        <div className={styles.selectWrapper}>
          <select value={hook.subdistrict} onChange={(e) => hook.handleSubdistrict(e.target.value)} className={styles.select} disabled={disabled || !hook.district}>
            <option value="">เลือก</option>
            {hook.subDistricts.map((s) => <option key={s.name} value={s.name}>{s.name}</option>)}
          </select>
          <span className={styles.selectArrow}><svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M6 9L12 15L18 9" stroke="#6b7280" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg></span>
        </div>
      </div>
      <div className={styles.formGroup}>
        <label className={styles.label}>รหัสไปรษณีย์</label>
        <input type="text" value={hook.postalCode} onChange={(e) => hook.setPostalCode(e.target.value)} className={styles.input} maxLength={5} placeholder="อัตโนมัติ" disabled={disabled} readOnly={!!hook.subdistrict} />
      </div>
    </div>
  );

  /* ════ RENDER ════ */
  return (
    <div className={styles.pageWrapper}>
      <header className={styles.banner}>
        <div className={styles.bannerOverlay}>
          <div className={styles.bannerContent}>
            <h1 className={styles.bannerTitle}>แจ้งเบาะแสร้านยาแขวนป้าย</h1>
          </div>
        </div>
      </header>

      <div className={styles.container}>
        {renderStepper()}

        {/* ══════ STEP 1 ══════ */}
        {currentStep === 0 && (
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <div className={styles.cardHeaderIcon}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <path d="M12 12C14.7614 12 17 9.76142 17 7C17 4.23858 14.7614 2 12 2C9.23858 2 7 4.23858 7 7C7 9.76142 9.23858 12 12 12Z" fill="white" />
                  <path d="M12 14C7.58172 14 4 17.5817 4 22H20C20 17.5817 16.4183 14 12 14Z" fill="white" />
                </svg>
              </div>
              <h2 className={styles.cardTitle}>ข้อมูลผู้ร้อง</h2>
            </div>
            <div className={styles.formBody}>
              {/* คำนำหน้า */}
              <div className={styles.formGroup} style={{ maxWidth: 220 }}>
                <label className={styles.label}>คำนำหน้าชื่อ-นามสกุล <span className={styles.required}>*</span></label>
                <div className={styles.selectWrapper}>
                  <select name="title" value={s1.title} onChange={(e) => setS1({ ...s1, title: e.target.value })} className={styles.select}>
                    <option value="">เลือก</option>
                    {TITLE_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <span className={styles.selectArrow}><svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M6 9L12 15L18 9" stroke="#6b7280" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg></span>
                </div>
              </div>
              {/* ชื่อ + นามสกุล */}
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>ชื่อภาษาไทย <span className={styles.required}>*</span></label>
                  <input type="text" value={s1.firstName} onChange={(e) => setS1({ ...s1, firstName: e.target.value })} placeholder="กรอกชื่อของคุณ" className={styles.input} />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>นามสกุลภาษาไทย <span className={styles.required}>*</span></label>
                  <input type="text" value={s1.lastName} onChange={(e) => setS1({ ...s1, lastName: e.target.value })} placeholder="กรอกนามสกุลของคุณ" className={styles.input} />
                </div>
              </div>
              {/* เบอร์ */}
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>เบอร์โทรศัพท์ที่ติดต่อได้ <span className={styles.required}>*</span> <span className={styles.hint}>(10 หลัก)</span></label>
                  <input type="tel" value={s1.phone} onChange={(e) => setS1({ ...s1, phone: e.target.value })} placeholder="กรอกเบอร์โทรศัพท์ของคุณ" className={styles.input} maxLength={10} />
                </div>
                <div className={styles.formGroup} />
              </div>
              {/* ที่อยู่ */}
              <div className={styles.formGroup}>
                <label className={styles.label}>ที่อยู่ที่สามารถติดต่อได้ <span className={styles.required}>*</span></label>
                <textarea value={s1.address} onChange={(e) => setS1({ ...s1, address: e.target.value })} placeholder="บ้านเลขที่ หมู่บ้าน ซอย ถนน..." className={styles.textarea} rows={3} />
              </div>
              {renderAddressRow(addr1)}
              {/* ไม่ระบุตัวตน */}
              <div className={styles.anonymousRow}>
                <label className={styles.checkboxLabel}>
                  <input type="checkbox" checked={isAnonymous} onChange={(e) => setIsAnonymous(e.target.checked)} className={styles.checkbox} />
                  <span className={styles.checkboxText}>ไม่ระบุตัวตน</span>
                </label>
              </div>
              <div className={styles.btnRow}>
                <button type="button" className={styles.btnNext} onClick={handleNext}>
                  ยืนยัน
                  
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ══════ STEP 2 ══════ */}
        {currentStep === 1 && (
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <div className={styles.cardHeaderIcon}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <path d="M3 9L12 2L21 9V20C21 20.5523 20.5523 21 20 21H15V15H9V21H4C3.44772 21 3 20.5523 3 20V9Z" fill="white" />
                </svg>
              </div>
              <h2 className={styles.cardTitle}>ข้อมูลร้านยา</h2>
            </div>

            <div className={styles.formBody}>
              {/* ชื่อร้านยา */}
              <div className={styles.formGroup}>
                <label className={styles.label}>ชื่อร้านยา <span className={styles.required}>*</span></label>
                <input type="text" value={s2.shopName} onChange={(e) => setS2({ ...s2, shopName: e.target.value })} placeholder="กรอกชื่อร้านยา" className={styles.input} />
              </div>

              {/* ที่อยู่ร้านยา */}
              <div className={styles.sectionDivider}>
                <span className={styles.sectionLabel}>ที่อยู่ร้านยา</span>
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>ที่อยู่ <span className={styles.required}>*</span></label>
                <textarea value={s2.shopAddress} onChange={(e) => setS2({ ...s2, shopAddress: e.target.value })} placeholder="บ้านเลขที่ หมู่บ้าน ซอย ถนน..." className={styles.textarea} rows={2} />
              </div>
              {renderAddressRow(addr2)}

              {/* ตำแหน่งที่ตั้ง */}
              <div className={styles.sectionDivider}>
                <span className={styles.sectionLabel}>ตำแหน่งที่ตั้ง (คลิกบนแผนที่เพื่อปักหมุด)</span>
              </div>
              <LocationPicker
                lat={s2.lat}
                lng={s2.lng}
                center={mapCenter}
                zoom={mapZoom}
                onChange={(lat, lng) => setS2({ ...s2, lat, lng })}
              />
              <div className={styles.locationCoords}>
                <div className={styles.coordItem}>
                  <span className={styles.coordLabel}>ละติจูด:</span>
                  <span className={styles.coordValue}>{s2.lat || "—"}</span>
                </div>
                <div className={styles.coordItem}>
                  <span className={styles.coordLabel}>ลองติจูด:</span>
                  <span className={styles.coordValue}>{s2.lng || "—"}</span>
                </div>
              </div>

              {/* ข้อมูลเภสัชกร */}
              <div className={styles.sectionDivider}>
                <span className={styles.sectionLabel}>ข้อมูลเภสัชกร <span className={styles.optionalBadge}>ถ้ามี / ไม่บังคับ</span></span>
              </div>
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>ชื่อ</label>
                  <input type="text" value={s2.pharmacistFirstName} onChange={(e) => setS2({ ...s2, pharmacistFirstName: e.target.value })} placeholder="กรอกชื่อเภสัชกร" className={styles.input} />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>นามสกุล</label>
                  <input type="text" value={s2.pharmacistLastName} onChange={(e) => setS2({ ...s2, pharmacistLastName: e.target.value })} placeholder="กรอกนามสกุลเภสัชกร" className={styles.input} />
                </div>
              </div>
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>เลขใบประกอบวิชาชีพเภสัชกรรม</label>
                  <input type="text" value={s2.licenseNo} onChange={(e) => setS2({ ...s2, licenseNo: e.target.value })} placeholder="กรอกเลขใบประกอบวิชาชีพ" className={styles.input} />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>เวลาปฏิบัติหน้าที่</label>
                  <div className={styles.timeSelectRow}>
                    <TimePicker value={s2.workHoursStart} onChange={(v) => setS2({ ...s2, workHoursStart: v })} placeholder="เริ่ม" />
                    <span className={styles.timeSeparator}>-</span>
                    <TimePicker value={s2.workHoursEnd} onChange={(v) => setS2({ ...s2, workHoursEnd: v })} placeholder="สิ้นสุด" />
                  </div>
                </div>
              </div>

              <div className={styles.btnRow}>
                <button type="button" className={styles.btnBack} onClick={handleBack}>ย้อนกลับ</button>
                <button type="button" className={styles.btnNext} onClick={handleNext}>
                  ยืนยัน
                  
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ══════ STEP 3 ══════ */}
        {currentStep === 2 && (
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <div className={styles.cardHeaderIcon}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="white" />
                  <path d="M2 17L12 22L22 17" stroke="white" strokeWidth="2" strokeLinecap="round" />
                  <path d="M2 12L12 17L22 12" stroke="white" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </div>
              <h2 className={styles.cardTitle}>ข้อมูลเบาะแส</h2>
            </div>
            <div className={styles.formBody}>
              {/* วันและเวลาที่พบ */}
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>วันที่พบ <span className={styles.required}>*</span></label>
                  <DatePicker value={s3.foundDate} onChange={(v) => setS3({ ...s3, foundDate: v })} placeholder="เลือกวันที่" />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>เวลาที่พบ <span className={styles.required}>*</span></label>
                  <TimePicker value={s3.foundTime} onChange={(v) => setS3({ ...s3, foundTime: v })} placeholder="เลือกเวลา" />
                </div>
              </div>

              {/* พฤติกรรม */}
              <div className={styles.formGroup}>
                <label className={styles.label}>พฤติกรรม <span className={styles.required}>*</span></label>
                <textarea value={s3.behavior} onChange={(e) => setS3({ ...s3, behavior: e.target.value })} placeholder="อธิบายพฤติกรรมที่พบ..." className={styles.textarea} rows={4} />
              </div>

              {/* แนบหลักฐาน */}
              <div className={styles.formGroup}>
                <label className={styles.label}>แนบหลักฐาน <span className={styles.optionalBadge}>ถ้ามี</span></label>
                <label
                  className={styles.uploadArea}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const files = Array.from(e.dataTransfer.files);
                    setEvidenceFiles((prev) => [...prev, ...files]);
                  }}
                >
                  <input
                    type="file"
                    multiple
                    accept="image/*,.pdf,.doc,.docx"
                    className={styles.uploadInput}
                    onChange={(e) => {
                      const files = Array.from(e.target.files || []);
                      setEvidenceFiles((prev) => [...prev, ...files]);
                      e.target.value = "";
                    }}
                  />
                  <div className={styles.uploadIcon}>
                    <svg width="40" height="40" viewBox="0 0 48 48" fill="none">
                      <path d="M24 32V16M24 16L18 22M24 16L30 22" stroke="#737300" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M12 32C8.68629 32 6 29.3137 6 26C6 23.0948 8.07264 20.6783 10.8119 20.1C11.4742 16.6118 14.4804 14 18.0938 14C19.1325 14 20.1201 14.2312 21.0049 14.6438C22.4604 11.8559 25.418 10 28.8125 10C33.7825 10 37.8125 14.0299 37.8125 19C37.8125 19.1677 37.8089 19.3345 37.802 19.5002C40.2635 20.4392 42 22.822 42 25.625C42 29.1458 39.1458 32 35.625 32" stroke="#737300" strokeWidth="2.5" strokeLinecap="round" />
                    </svg>
                  </div>
                  <span className={styles.uploadText}>คลิกหรือลากไฟล์มาวาง</span>
                  <span className={styles.uploadHint}>รองรับ: รูปภาพ, PDF, DOC</span>
                </label>
                {/* File preview list */}
                {evidenceFiles.length > 0 && (
                  <div className={styles.fileList}>
                    {evidenceFiles.map((file, i) => (
                      <div key={i} className={styles.fileItem}>
                        <span className={styles.fileName}>{file.name}</span>
                        <span className={styles.fileSize}>{(file.size / 1024).toFixed(0)} KB</span>
                        <button
                          type="button"
                          className={styles.fileRemove}
                          onClick={() => setEvidenceFiles((prev) => prev.filter((_, idx) => idx !== i))}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* การยินยอม */}
              <div className={styles.consentBox}>
                <label className={styles.radioLabel}>
                  <input type="radio" name="consent" value="yes" checked={s3.consent === "yes"} onChange={() => setS3({ ...s3, consent: "yes" })} className={styles.radio} />
                  <span className={styles.radioText}>ข้าพเจ้ายินยอมให้เปิดเผยข้อมูล</span>
                </label>
                <label className={styles.radioLabel}>
                  <input type="radio" name="consent" value="no" checked={s3.consent === "no"} onChange={() => setS3({ ...s3, consent: "no" })} className={styles.radio} />
                  <span className={styles.radioText}>ข้าพเจ้าไม่ยินยอมให้เปิดเผยข้อมูล</span>
                </label>
              </div>

              <div className={styles.btnRow}>
                <button type="button" className={styles.btnBack} onClick={handleBack}>ย้อนกลับ</button>
                <button type="button" className={styles.btnSubmit}>
                  ส่งข้อมูล
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path d="M22 2L11 13" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
                    <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
