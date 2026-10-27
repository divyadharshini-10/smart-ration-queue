import { useEffect, useState } from 'react';
import './App.css';
import { supabase } from './supabase';
import { QRCodeSVG } from 'qrcode.react';
import { Html5Qrcode } from 'html5-qrcode';

type Role = 'consumer' | 'dealer' | 'official';
type StockItem = { name: string; quantity: number };
type Shop = {
  id: string;
  name: string;
  village: string;
  distance: string;
  hours: string;
  crowd: string;
  stock: StockItem[];
};
type Token = { number: string; shopName: string; date: string; slot: string };

function getStockStatus(quantity: number) {
  if (quantity === 0) return 'Out of stock';
  if (quantity < 20) return 'Low stock';
  return 'In stock';
}

const initialShops: Shop[] = [
  {
    id: '001', name: 'Demo Fair Price Shop 001', village: 'Greenfield',
    distance: '0.8 km', hours: '9:00 AM – 5:00 PM', crowd: 'Low',
    stock: [
      { name: 'Rice', quantity: 180 }, { name: 'Wheat', quantity: 65 },
      { name: 'Sugar', quantity: 8 }, { name: 'Toor dal', quantity: 0 },
    ],
  },
  {
    id: '002', name: 'Demo Fair Price Shop 002', village: 'Lakeview',
    distance: '1.5 km', hours: '9:00 AM – 5:00 PM', crowd: 'Medium',
    stock: [
      { name: 'Rice', quantity: 120 }, { name: 'Wheat', quantity: 40 },
      { name: 'Sugar', quantity: 35 }, { name: 'Toor dal', quantity: 12 },
    ],
  },
  {
    id: '003', name: 'Demo Fair Price Shop 003', village: 'Hillview',
    distance: '2.1 km', hours: '9:00 AM – 4:30 PM', crowd: 'High',
    stock: [
      { name: 'Rice', quantity: 0 }, { name: 'Wheat', quantity: 24 },
      { name: 'Sugar', quantity: 20 }, { name: 'Toor dal', quantity: 18 },
    ],
  },
  {
    id: '004', name: 'Demo Fair Price Shop 004', village: 'Riverside',
    distance: '2.8 km', hours: '9:00 AM – 5:00 PM', crowd: 'Low',
    stock: [
      { name: 'Rice', quantity: 90 }, { name: 'Wheat', quantity: 55 },
      { name: 'Sugar', quantity: 0 }, { name: 'Toor dal', quantity: 22 },
    ],
  },
];

function App() {
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [email, setEmail] = useState('user01@gmail.com');
  const [password, setPassword] = useState('');
  const [consumerPhone, setConsumerPhone] = useState('');
  const [rationCardNumber, setRationCardNumber] = useState('');
  const [consumerOtp, setConsumerOtp] = useState('');
  const [consumerIdentity, setConsumerIdentity] = useState<string | null>(null);
  const [loggedIn, setLoggedIn] = useState(false);
  const [loginMessage, setLoginMessage] = useState('');
  const [search, setSearch] = useState('');
  const [shops, setShops] = useState<Shop[]>(() => {
    try {
      const saved = localStorage.getItem('ration-shops');
      return saved ? (JSON.parse(saved) as Shop[]) : initialShops;
    } catch {
      return initialShops;
    }
  });
  const [stockMessage, setStockMessage] = useState('Loading stock from database...');
  const [stockDrafts, setStockDrafts] = useState<Record<string, string>>({});
  const [stockSaveMessage, setStockSaveMessage] = useState('');
  const [savingStockKey, setSavingStockKey] = useState<string | null>(null);
  const [assignedShopCode, setAssignedShopCode] = useState<string | null>(null);
  const [officialComplaints, setOfficialComplaints] = useState<any[]>([]);
  const [officialComplaintMessage, setOfficialComplaintMessage] = useState('');
  const [officialComplaintsLoading, setOfficialComplaintsLoading] = useState(false);
  const [updatingComplaintCode, setUpdatingComplaintCode] = useState<string | null>(null);
  const [shortageSignals, setShortageSignals] = useState<any[]>([]);
  const [issuedTotalKg, setIssuedTotalKg] = useState(0);
  const [recentIssued, setRecentIssued] = useState<any[]>([]);
  const [monitoringMessage, setMonitoringMessage] = useState('');
  const [monitoringLoading, setMonitoringLoading] = useState(false);
  const [activeToken, setActiveToken] = useState<Token | null>(null);
  const [showBooking, setShowBooking] = useState(false);
  const [bookingShop, setBookingShop] = useState('SHOP001');
  const [bookingDate, setBookingDate] = useState('');
  const [bookingSlot, setBookingSlot] = useState('9:00 AM – 11:00 AM');
  const [bookingMessage, setBookingMessage] = useState('');
  const [complaintCategory, setComplaintCategory] = useState('Ration not provided');
  const [complaintShop, setComplaintShop] = useState('SHOP001');
  const [complaintDescription, setComplaintDescription] = useState('');
  const [complaintMessage, setComplaintMessage] = useState('');
  const [complaintSubmitting, setComplaintSubmitting] = useState(false);
  const [myComplaints, setMyComplaints] = useState<any[]>([]);
  const [complaintsLoading, setComplaintsLoading] = useState(false);
  const [notifications, setNotifications] = useState<string[]>([]);
  const [language, setLanguage] = useState<'English' | 'தமிழ்'>('English');
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scanResult, setScanResult] = useState('');
  const [scannedTokenCode, setScannedTokenCode] = useState('');
  const [distributionItems, setDistributionItems] = useState<
    Record<string, string>
  >({});
  const [distributionMessage, setDistributionMessage] = useState('');
  const [distributionSubmitting, setDistributionSubmitting] = useState(false);

  const today = new Date().toLocaleDateString('en-CA');

  const pageStyle: React.CSSProperties = {
    maxWidth: 1100, margin: '0 auto', padding: 24, boxSizing: 'border-box',
  };
  const cardStyle: React.CSSProperties = {
    border: '1px solid #e2e8f0', borderRadius: 14, padding: 20,
    background: '#ffffff', boxShadow: '0 3px 12px rgba(0,0,0,0.04)',
  };
  const buttonStyle: React.CSSProperties = {
    border: 'none', borderRadius: 8, padding: '10px 16px',
    background: '#176b45', color: '#ffffff', cursor: 'pointer', fontWeight: 600,
  };
  const inputStyle: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box', padding: 10,
    border: '1px solid #cbd5e1', borderRadius: 8, marginTop: 6, marginBottom: 12,
  };

  // Start the dealer QR scanner only while its panel is open. Cleanup stops the camera.
  useEffect(() => {
    if (!scannerOpen || !loggedIn || selectedRole !== 'dealer') return;

    let disposed = false;
    let handlingScan = false;
    const scanner = new Html5Qrcode('dealer-qr-reader');

    const stopScanner = async () => {
      try {
        if (scanner.isScanning) await scanner.stop();
      } catch (error) {
        console.warn('Could not stop QR scanner cleanly:', error);
      }
      try {
        scanner.clear();
      } catch {
        // The scanner may not have finished initializing.
      }
    };

    const verifyToken = async (tokenCode: string) => {
      try {
        const { data, error } = await supabase.rpc('verify_ration_token', {
          p_token_code: tokenCode.trim(),
        });

        if (error) throw error;

        const result = Array.isArray(data) ? data[0] : data;

        if (!result?.success) {
          setScannedTokenCode('');
          setDistributionMessage('');
          setScanResult(result?.message ?? 'Token verification failed.');
          return;
        }

        setScannedTokenCode(result.token_code ?? tokenCode.trim());
        setDistributionItems({});
        setDistributionMessage('');
        setScanResult(result.message ?? 'Token verified successfully.');
      } catch (error) {
        setScannedTokenCode('');
        setScanResult(
          error instanceof Error
            ? `Verification failed: ${error.message}`
            : 'Token verification failed. Please try again.'
        );
      }
    };

    const startScanner = async () => {
      try {
        await scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 220, height: 220 } },
          async (decodedText) => {
            if (disposed || handlingScan) return;
            handlingScan = true;
            await stopScanner();
            if (disposed) return;
            setScannerOpen(false);
            await verifyToken(decodedText);
          },
          () => { /* Ignore repeated frames without a QR code. */ }
        );
        if (disposed) await stopScanner();
      } catch (error) {
        if (!disposed) {
          setScanResult(
            error instanceof Error
              ? `Could not start camera: ${error.message}`
              : 'Could not start camera. Check browser camera permissions.'
          );
          setScannerOpen(false);
        }
      }
    };

    void startScanner();
    return () => {
      disposed = true;
      void stopScanner();
    };
  }, [scannerOpen, loggedIn, selectedRole]);

  // Keep a local backup for consumer/demo views. Supabase remains the source for stock.
  useEffect(() => {
    localStorage.setItem('ration-shops', JSON.stringify(shops));
  }, [shops]);

  async function loadStock() {
    const { data: shopData, error: shopError } = await supabase
      .from('shops')
      .select('id, shop_code, name, village');

    if (shopError) {
      console.error('Error loading shops:', shopError.message);
      setStockMessage('Could not load database shops. Showing saved demo data.');
      return;
    }

    const { data: stockData, error: stockError } = await supabase
      .from('stock_items')
      .select('shop_id, item_name, quantity_kg');

    if (stockError) {
      console.error('Error loading stock:', stockError.message);
      setStockMessage('Could not load database stock. Showing saved demo data.');
      return;
    }

    const loadedShops: Shop[] = (shopData ?? []).map((shop) => ({
      id: shop.shop_code,
      name: shop.name,
      village: shop.village,
      distance: 'Not available',
      hours: '9:00 AM – 5:00 PM',
      crowd: 'Unknown',
      stock: (stockData ?? [])
        .filter((item) => item.shop_id === shop.id)
        .map((item) => ({
          name: item.item_name,
          quantity: Number(item.quantity_kg),
        })),
    }));

    if (loadedShops.length > 0) {
      setShops(loadedShops);
      setStockMessage('Stock loaded successfully from Supabase.');
    } else {
      setStockMessage('No shops were found in Supabase. Showing demo data.');
    }
  }

  useEffect(() => {
    let cancelled = false;
    async function initialLoad() {
      // Avoid setting state if this component has unmounted.
      const { data: shopData, error: shopError } = await supabase
        .from('shops').select('id, shop_code, name, village');
      if (cancelled) return;
      if (shopError) {
        console.error('Error loading shops:', shopError.message);
        setStockMessage('Could not load database shops. Showing saved demo data.');
        return;
      }
      const { data: stockData, error: stockError } = await supabase
        .from('stock_items').select('shop_id, item_name, quantity_kg');
      if (cancelled) return;
      if (stockError) {
        console.error('Error loading stock:', stockError.message);
        setStockMessage('Could not load database stock. Showing saved demo data.');
        return;
      }
      const loadedShops: Shop[] = (shopData ?? []).map((shop) => ({
        id: shop.shop_code, name: shop.name, village: shop.village,
        distance: 'Not available', hours: '9:00 AM – 5:00 PM', crowd: 'Unknown',
        stock: (stockData ?? []).filter((item) => item.shop_id === shop.id)
          .map((item) => ({ name: item.item_name, quantity: Number(item.quantity_kg) })),
      }));
      if (loadedShops.length > 0) {
        setShops(loadedShops);
        setStockMessage('Stock loaded successfully from Supabase.');
      } else {
        setStockMessage('No shops were found in Supabase. Showing demo data.');
      }
    }
    void initialLoad();
    return () => { cancelled = true; };
  }, []);

  async function loginConsumerWithDummyOtp() {
    const phone = consumerPhone.trim();
    const rationCard = rationCardNumber.trim();

    if (!/^\d{10}$/.test(phone)) {
      setLoginMessage('Enter a valid 10-digit phone number.');
      return;
    }

    if (!rationCard) {
      setLoginMessage('Enter your ration card number.');
      return;
    }

    if (consumerOtp.trim() !== '123456') {
      setLoginMessage('For this demo, enter OTP 123456.');
      return;
    }

    setLoginMessage('Loading your saved token...');

    try {
      const { data, error } = await supabase.rpc(
        'demo_get_consumer_token',
        {
          p_phone: phone,
          p_ration_card: rationCard,
          p_otp: '123456',
        }
      );

      if (error) throw error;

      const identity = `${phone}::${rationCard.toUpperCase()}`;
      const savedToken = data?.token ?? null;

      setConsumerIdentity(identity);
      setActiveToken(savedToken);
      setNotifications([]);
      setSearch('');
      setLoggedIn(true);
      setLoginMessage(
        savedToken
          ? 'Welcome back! Your saved token has been loaded.'
          : 'Login successful. You have no booked token yet.'
      );
      setConsumerOtp('');
    } catch (error) {
      console.error('Consumer token retrieval failed:', error);
      setLoginMessage(
        error instanceof Error
          ? `Could not load your token: ${error.message}`
          : 'Could not load your token. Please try again.'
      );
    }
  }

  async function loginWithPassword() {
    if (!selectedRole) {
      setLoginMessage('Please select your role first.');
      return;
    }
    if (!email.trim() || !password) {
      setLoginMessage('Enter your email and password.');
      return;
    }

    setLoginMessage('Signing in...');
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(), password,
    });
    if (error || !data.user) {
      setLoginMessage(error?.message ?? 'Unable to sign in. Please try again.');
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('role, shop_code')
      .eq('user_id', data.user.id)
      .maybeSingle();

    if (profileError || !profile) {
      await supabase.auth.signOut();
      setLoginMessage('No authorized profile was found for this account. Check user_profiles permissions and data.');
      return;
    }
    if (profile.role !== selectedRole) {
      await supabase.auth.signOut();
      setLoginMessage(`This account is registered as ${profile.role}, not ${selectedRole}.`);
      return;
    }
    if (profile.role === 'dealer' && !profile.shop_code) {
      await supabase.auth.signOut();
      setLoginMessage('This dealer account has no assigned shop. Contact the administrator.');
      return;
    }

    setAssignedShopCode(profile.shop_code ?? null);
    setLoggedIn(true);
    setLoginMessage('');
    setPassword('');
  }

  async function logout() {
    const { error } = await supabase.auth.signOut();
    if (error) setLoginMessage(`Sign-out error: ${error.message}`);
    setScannerOpen(false);
    setLoggedIn(false);
    setSelectedRole(null);
    setAssignedShopCode(null);
    setConsumerIdentity(null);
    setActiveToken(null);
    setConsumerPhone('');
    setRationCardNumber('');
    setConsumerOtp('');
    setEmail('user01@gmail.com');
    setPassword('');
    setSearch('');
    setStockSaveMessage('');
    setLoginMessage('');
    setStockDrafts({});
  }

  function updateStock(shopId: string, itemName: string, value: string) {
    const key = `${shopId}-${itemName}`;
    setStockDrafts((current) => ({ ...current, [key]: value }));
    setStockSaveMessage('');
  }

  // Writes stock to Supabase; the database RLS policy is the actual authorization boundary.
  async function saveStock(shopCode: string, itemName: string) {
    const key = `${shopCode}-${itemName}`;
    const value = stockDrafts[key];
    if (value === undefined || value.trim() === '') {
      setStockSaveMessage('Please enter a quantity.');
      return;
    }

    const quantity = Number(value);
    if (!Number.isSafeInteger(quantity) || quantity < 0) {
      setStockSaveMessage('Enter a whole number greater than or equal to zero.');
      return;
    }

    setSavingStockKey(key);
    setStockSaveMessage('');

    try {
      const { data: userResult, error: userError } = await supabase.auth.getUser();
      if (userError || !userResult.user) {
        throw new Error('Your session has expired. Please log in again.');
      }

      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('role, shop_code')
        .eq('user_id', userResult.user.id)
        .maybeSingle();

      if (profileError || !profile) {
        throw new Error('Could not verify your dealer profile.');
      }
      if (profile.role !== 'dealer' || profile.shop_code !== shopCode) {
        throw new Error('You are not authorized to edit this shop.');
      }

      const { data: dbShop, error: shopError } = await supabase
        .from('shops')
        .select('id')
        .eq('shop_code', shopCode)
        .single();

      if (shopError || !dbShop) {
        throw new Error(shopError?.message ?? 'Shop not found.');
      }

      const { data: updatedRows, error: updateError } = await supabase
        .from('stock_items')
        .update({ quantity_kg: quantity, updated_at: new Date().toISOString() })
        .eq('shop_id', dbShop.id)
        .eq('item_name', itemName)
        .select('id');

      if (updateError) throw updateError;
      if (!updatedRows || updatedRows.length === 0) {
        throw new Error('No stock row was updated. Check database permissions and the item name.');
      }

      // Refresh from the database after a confirmed update.
      await loadStock();
      setStockDrafts((current) => {
        const next = { ...current };
        delete next[key];
        return next;
      });
      setStockSaveMessage(`${itemName} stock saved to Supabase successfully.`);
    } catch (error) {
      console.error('Save stock failed:', error);
      setStockSaveMessage(error instanceof Error
        ? `Could not save stock: ${error.message}`
        : 'Could not save stock. Please try again.');
    } finally {
      setSavingStockKey(null);
    }
  }

  async function confirmDistribution() {
    if (!scannedTokenCode) {
      setDistributionMessage('Scan a valid token first.');
      return;
    }

    const items = Object.entries(distributionItems)
      .filter(([, value]) => value.trim() !== '')
      .map(([item_name, value]) => ({
        item_name,
        quantity_kg: Number(value),
      }));

    if (items.length === 0) {
      setDistributionMessage('Enter at least one item quantity.');
      return;
    }

    if (items.some(
      (item) =>
        !Number.isFinite(item.quantity_kg) ||
        item.quantity_kg <= 0
    )) {
      setDistributionMessage('Every quantity must be greater than zero.');
      return;
    }

    setDistributionSubmitting(true);
    setDistributionMessage('Recording distribution...');

    try {
      const { data, error } = await supabase.rpc(
        'confirm_ration_distribution',
        {
          p_token_code: scannedTokenCode,
          p_items: items,
        }
      );

      if (error) throw error;

      if (!data?.success) {
        throw new Error(data?.message ?? 'Distribution failed.');
      }

      setDistributionMessage(
        `Success! ${data.total_kg} kg distributed. ` +
        `${data.items_issued} item(s) recorded.`
      );
      setScanResult(`Token ${scannedTokenCode} redeemed successfully.`);
      setScannedTokenCode('');
      setDistributionItems({});

      await loadStock();
    } catch (error) {
      setDistributionMessage(
        error instanceof Error
          ? `Distribution failed: ${error.message}`
          : 'Distribution failed. Please try again.'
      );
    } finally {
      setDistributionSubmitting(false);
    }
  }

  async function bookToken() {
    if (!bookingDate || bookingDate < today) {
      setBookingMessage('Please choose today or a future date.');
      return;
    }

    if (!consumerIdentity) {
      setBookingMessage('Please log in again to continue.');
      return;
    }

    const shop = shops.find((item) => item.id === bookingShop);

    if (!shop) {
      setBookingMessage('Please select a valid shop.');
      return;
    }

    setBookingMessage('Booking your token...');

    try {
      const { data, error } = await supabase.rpc(
        'demo_book_ration_token',
        {
          p_phone: consumerPhone.trim(),
          p_ration_card: rationCardNumber.trim(),
          p_otp: '123456',
          p_shop_code: bookingShop,
          p_token_date: bookingDate,
          p_time_slot: bookingSlot,
        }
      );

      if (error) throw error;

      if (!data?.token) {
        throw new Error('No token was returned by the server.');
      }

      const token: Token = {
        number: data.token.number,
        shopName: data.token.shopName,
        date: data.token.date,
        slot: data.token.slot,
      };

      setActiveToken(token);
      setBookingMessage('Token booked and saved to Supabase successfully.');
      setShowBooking(false);
    } catch (error) {
      console.error('Token booking failed:', error);
      setBookingMessage(
        error instanceof Error
          ? `Booking failed: ${error.message}`
          : 'Booking failed. Please try again.'
      );
    }
  }

  async function loadOfficialComplaints() {
    setOfficialComplaintsLoading(true);
    setOfficialComplaintMessage('');

    try {
      const { data, error } = await supabase.rpc(
        'official_get_ration_complaints'
      );

      if (error) throw error;

      setOfficialComplaints(Array.isArray(data) ? data : []);
      setOfficialComplaintMessage(
        Array.isArray(data) && data.length === 0
          ? 'No complaints have been submitted yet.'
          : 'Complaints loaded successfully.'
      );
    } catch (error) {
      setOfficialComplaintMessage(
        error instanceof Error
          ? `Could not load complaints: ${error.message}`
          : 'Could not load complaints.'
      );
    } finally {
      setOfficialComplaintsLoading(false);
    }
  }

  async function loadRationMonitoring() {
    setMonitoringLoading(true);
    setMonitoringMessage('');

    try {
      const { data, error } = await supabase.rpc(
        'official_get_ration_monitoring'
      );

      if (error) throw error;

      setShortageSignals(data?.shortages ?? []);
      setIssuedTotalKg(Number(data?.issued_total_kg ?? 0));
      setRecentIssued(data?.recent_issued ?? []);
      setMonitoringMessage('Monitoring data loaded successfully.');
    } catch (error) {
      console.error('Ration monitoring error:', error);

      const message =
        error instanceof Error
          ? error.message
          : JSON.stringify(error);

      setMonitoringMessage(
        `Could not load monitoring: ${message}`
      );
    } finally {
      setMonitoringLoading(false);
    }
  }

  async function updateOfficialComplaint(
    complaintCode: string,
    status: string,
    remarks: string
  ) {
    setUpdatingComplaintCode(complaintCode);
    setOfficialComplaintMessage('');

    try {
      const { error } = await supabase.rpc(
        'official_update_ration_complaint',
        {
          p_complaint_code: complaintCode,
          p_status: status,
          p_official_remarks: remarks
        }
      );

      if (error) throw error;

      setOfficialComplaintMessage(
        `Complaint ${complaintCode} updated successfully.`
      );

      await loadOfficialComplaints();
    } catch (error) {
      setOfficialComplaintMessage(
        error instanceof Error
          ? `Update failed: ${error.message}`
          : 'Could not update complaint.'
      );
    } finally {
      setUpdatingComplaintCode(null);
    }
  }

  async function submitComplaint() {
    if (!consumerIdentity) {
      setComplaintMessage('Please log in again.');
      return;
    }

    if (complaintDescription.trim().length < 10) {
      setComplaintMessage('Please describe the issue in at least 10 characters.');
      return;
    }

    setComplaintSubmitting(true);
    setComplaintMessage('Submitting complaint...');

    try {
      const { data, error } = await supabase.rpc(
        'demo_submit_ration_complaint',
        {
          p_phone: consumerPhone.trim(),
          p_ration_card: rationCardNumber.trim(),
          p_otp: '123456',
          p_shop_code: complaintShop,
          p_category: complaintCategory,
          p_description: complaintDescription.trim(),
        }
      );

      if (error) throw error;
      if (!data?.success) {
        throw new Error(data?.message ?? 'Complaint submission failed.');
      }

      setComplaintMessage(
        `Complaint submitted! Your tracking ID is ${data.complaint_code}.`
      );
      setComplaintDescription('');
      await loadMyComplaints();
    } catch (error) {
      setComplaintMessage(
        error instanceof Error
          ? `Could not submit: ${error.message}`
          : 'Could not submit the complaint.'
      );
    } finally {
      setComplaintSubmitting(false);
    }
  }

  async function loadMyComplaints() {
    if (!consumerIdentity) return;

    setComplaintsLoading(true);

    try {
      const { data, error } = await supabase.rpc(
        'demo_get_my_ration_complaints',
        {
          p_phone: consumerPhone.trim(),
          p_ration_card: rationCardNumber.trim(),
          p_otp: '123456',
        }
      );

      if (error) throw error;
      setMyComplaints(Array.isArray(data) ? data : []);
    } catch (error) {
      setComplaintMessage(
        error instanceof Error
          ? `Could not load complaints: ${error.message}`
          : 'Could not load your complaints.'
      );
    } finally {
      setComplaintsLoading(false);
    }
  }

  function notifyWhenAvailable(shop: Shop) {
    const unavailable = shop.stock.filter((item) => item.quantity === 0);
    const messages = unavailable.map(
      (item) => `Notification requested for ${item.name} at ${shop.name}.`,
    );
    setNotifications((current) => [
      ...current, ...messages.filter((message) => !current.includes(message)),
    ]);
  }

  const filteredShops = shops.filter((shop) => {
    const text = search.toLowerCase();
    return shop.name.toLowerCase().includes(text) || shop.village.toLowerCase().includes(text);
  });

  if (loggedIn && selectedRole === 'dealer') {
    const dealerShops = shops.filter((shop) => shop.id === assignedShopCode);
    return (
      <main style={pageStyle}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <h1>RATION DEALER DASHBOARD</h1>
            <p>Welcome, Ration Dealer!</p>
            <p>Manage your assigned shop stock and monitor ration distribution.</p>
            <p style={{ color: '#64748b', fontSize: 13 }}>{stockMessage}</p>
          </div>
          <button style={buttonStyle} onClick={logout}>Log out</button>
        </header>

        <section style={{ ...cardStyle, marginTop: 24 }}>
          <h2>Scan Consumer QR Token</h2>
          <p>Scan the QR code displayed on the consumer's active ration token to verify it.</p>
          {!scannerOpen ? (
            <button
              type="button"
              style={buttonStyle}
              onClick={() => { setScanResult(''); setScannerOpen(true); }}
            >
              Open QR Scanner
            </button>
          ) : (
            <div>
              <div id="dealer-qr-reader" style={{ width: '100%', maxWidth: 400 }} />
              <button
                type="button"
                style={{ ...buttonStyle, marginTop: 12, background: '#64748b' }}
                onClick={() => setScannerOpen(false)}
              >
                Close Scanner
              </button>
            </div>
          )}
          {scanResult && (
            <p role="status" aria-live="polite" style={{ marginTop: 12, overflowWrap: 'anywhere' }}>
              {scanResult}
            </p>
          )}

          {scannedTokenCode && (
            <div style={{ marginTop: 20, padding: 16, border: '1px solid #bbf7d0', borderRadius: 12 }}>
              <h3>Confirm Ration Distribution</h3>
              <p>Verified token: <strong>{scannedTokenCode}</strong></p>
              <p>Enter only the quantities actually handed to the consumer.</p>

              {['Rice', 'Sugar', 'Wheat', 'Oil'].map((item) => {
                const available =
                  dealerShops[0]?.stock.find((stock) => stock.name === item)?.quantity ?? 0;

                return (
                  <div key={item} style={{ marginBottom: 12 }}>
                    <label htmlFor={`issue-${item}`}>{item} (available: {available} kg)</label>
                    <input
                      id={`issue-${item}`}
                      type="number"
                      min="0"
                      max={available}
                      step="0.01"
                      style={inputStyle}
                      value={distributionItems[item] ?? ''}
                      placeholder="Quantity to issue in kg"
                      onChange={(event) =>
                        setDistributionItems((current) => ({
                          ...current,
                          [item]: event.target.value,
                        }))
                      }
                    />
                  </div>
                );
              })}

              <button
                type="button"
                style={buttonStyle}
                disabled={distributionSubmitting}
                onClick={() => void confirmDistribution()}
              >
                {distributionSubmitting ? 'Recording...' : 'Confirm & Record Distribution'}
              </button>

              <button
                type="button"
                style={{ ...buttonStyle, marginLeft: 8, background: '#64748b' }}
                disabled={distributionSubmitting}
                onClick={() => {
                  setScannedTokenCode('');
                  setDistributionItems({});
                  setDistributionMessage('');
                }}
              >
                Cancel
              </button>

              {distributionMessage && (
                <p role="status" aria-live="polite">{distributionMessage}</p>
              )}
            </div>
          )}
        </section>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(270px, 1fr))', gap: 20, marginTop: 24 }}>
          {dealerShops.length === 0 ? (
            <section style={cardStyle}>
              <h2>No assigned shop found</h2>
              <p>Your account does not have a matching shop assignment. Contact the administrator.</p>
            </section>
          ) : dealerShops.map((shop) => (
            <section key={shop.id} style={cardStyle}>
              <h2>{shop.name}</h2>
              <p>{shop.village} · {shop.id}</p>
              <h3>Available stock</h3>
              {shop.stock.map((item) => {
                const status = getStockStatus(item.quantity);
                const key = `${shop.id}-${item.name}`;
                return (
                  <div key={item.name} style={{ padding: '12px 0', borderTop: '1px solid #e2e8f0' }}>
                    <label htmlFor={`stock-${key}`}>{item.name}</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                      <input
                        id={`stock-${key}`}
                        aria-label={`${shop.name} ${item.name} quantity`}
                        type="number" min="0" step="1"
                        value={stockDrafts[key] ?? String(item.quantity)}
                        onChange={(event) => updateStock(shop.id, item.name, event.target.value)}
                        style={{ ...inputStyle, width: 110, margin: 0 }}
                      />
                      <span>kg</span>
                      <button
                        type="button"
                        disabled={savingStockKey === key}
                        style={{ ...buttonStyle, padding: '9px 12px', opacity: savingStockKey === key ? 0.7 : 1 }}
                        onClick={() => void saveStock(shop.id, item.name)}
                      >
                        {savingStockKey === key ? 'Saving...' : 'Save Stock'}
                      </button>
                    </div>
                    <p style={{ color: status === 'In stock' ? '#15803d' : status === 'Low stock' ? '#b45309' : '#b91c1c', marginBottom: 0 }}>
                      {status}
                    </p>
                  </div>
                );
              })}
            </section>
          ))}
        </div>

        {stockSaveMessage && (
          <p role="status" style={{
            color: stockSaveMessage.includes('saved to Supabase successfully') ? '#176b45' : '#b91c1c',
            fontSize: 14, marginTop: 20,
          }}>{stockSaveMessage}</p>
        )}
        <p style={{ color: '#64748b', fontSize: 13, marginTop: 24 }}>
          Stock is stored in Supabase. Only the shop assigned to your authenticated dealer profile can be edited.
        </p>
      </main>
    );
  }

  if (loggedIn && selectedRole === 'official') {
    const totalStock = shops.reduce((total, shop) => total + shop.stock.reduce((sum, item) => sum + item.quantity, 0), 0);
    const lowStockItems = shops.reduce((total, shop) => total + shop.stock.filter((item) => item.quantity > 0 && item.quantity < 20).length, 0);
    const outOfStockItems = shops.reduce((total, shop) => total + shop.stock.filter((item) => item.quantity === 0).length, 0);
    return (
      <main style={pageStyle}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <h1>GOVERNMENT OFFICIAL DASHBOARD</h1>
            <p>Overview of stock across all demo ration shops.</p>
            <p style={{ color: '#64748b', fontSize: 13 }}>{stockMessage}</p>
          </div>
          <button style={buttonStyle} onClick={logout}>Log out</button>
        </header>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginTop: 20 }}>
          <section style={cardStyle}><h3>Total shops</h3><h2>{shops.length}</h2></section>
          <section style={cardStyle}><h3>Total stock</h3><h2>{totalStock} kg</h2></section>
          <section style={cardStyle}><h3>Low-stock items</h3><h2>{lowStockItems}</h2></section>
          <section style={cardStyle}><h3>Out-of-stock items</h3><h2>{outOfStockItems}</h2></section>
        </div>
        <section style={{ ...cardStyle, marginTop: 24 }}>
          <h2>Shortage Signals & Ration Issued</h2>
          <p>Monitor stock shortages and actual ration distribution across shops.</p>

          <button
            type="button"
            style={buttonStyle}
            disabled={monitoringLoading}
            onClick={() => void loadRationMonitoring()}
          >
            {monitoringLoading ? 'Loading...' : 'Refresh Monitoring'}
          </button>

          {monitoringMessage && <p role="status">{monitoringMessage}</p>}

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: 16,
              marginTop: 16,
            }}
          >
            <div style={cardStyle}>
              <h3>Shortage Signals</h3>
              <p>{shortageSignals.length} items need attention</p>
            </div>

            <div style={cardStyle}>
              <h3>Total Ration Issued</h3>
              <p>{issuedTotalKg.toLocaleString()} kg</p>
            </div>
          </div>

          <h3>Items Requiring Restock</h3>

          {shortageSignals.length === 0 ? (
            <p>No shortage signals found.</p>
          ) : (
            shortageSignals.map((item, index) => (
              <div
                key={`${item.shop_code}-${item.item_name}-${index}`}
                style={{ ...cardStyle, marginTop: 12 }}
              >
                <strong>{item.level}</strong>
                <p>{item.shop_name} ({item.shop_code})</p>
                <p>{item.item_name}: {item.quantity_kg} kg</p>
              </div>
            ))
          )}

          <h3>Recent Ration Issued</h3>

          {recentIssued.length === 0 ? (
            <p>No ration issue records yet. The total is currently 0 kg.</p>
          ) : (
            recentIssued.map((item, index) => (
              <div
                key={`${item.shop_code}-${item.item_name}-${item.issued_at}-${index}`}
                style={{ ...cardStyle, marginTop: 12 }}
              >
                <p><strong>{item.shop_name}</strong> ({item.shop_code})</p>
                <p>{item.item_name}: {item.quantity_kg} kg</p>
                <p>{new Date(item.issued_at).toLocaleString()}</p>
              </div>
            ))
          )}
        </section>

        <section style={{ ...cardStyle, marginTop: 24 }}>
          <h2>Manage Consumer Complaints</h2>
          <p>Review consumer reports and record the action taken.</p>

          <button
            type="button"
            style={buttonStyle}
            disabled={officialComplaintsLoading}
            onClick={() => void loadOfficialComplaints()}
          >
            {officialComplaintsLoading ? 'Loading...' : 'Load Complaints'}
          </button>

          {officialComplaintMessage && (
            <p role="status" style={{ overflowWrap: 'anywhere' }}>
              {officialComplaintMessage}
            </p>
          )}

          {officialComplaints.map((complaint) => (
            <OfficialComplaintCard
              key={complaint.complaint_code}
              complaint={complaint}
              cardStyle={cardStyle}
              inputStyle={inputStyle}
              buttonStyle={buttonStyle}
              updating={updatingComplaintCode === complaint.complaint_code}
              onUpdate={updateOfficialComplaint}
            />
          ))}
        </section>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(270px, 1fr))', gap: 20, marginTop: 24 }}>
          {shops.map((shop) => (
            <section key={shop.id} style={cardStyle}>
              <h2>{shop.name}</h2><p>{shop.village}</p>
              <ul>{shop.stock.map((item) => <li key={item.name}>{item.name}: {item.quantity} kg — {getStockStatus(item.quantity)}</li>)}</ul>
            </section>
          ))}
        </div>
        <p style={{ color: '#64748b', fontSize: 13, marginTop: 24 }}>Demo data only. Not an official government service.</p>
      </main>
    );
  }

  if (loggedIn && selectedRole === 'consumer') {
    return (
      <main style={pageStyle}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <h1>Consumer Dashboard</h1>
            <p>Find ration shops, check stock, and book a token.</p>
            <p style={{ color: '#64748b', fontSize: 13 }}>{stockMessage}</p>
          </div>
          <button style={buttonStyle} onClick={logout}>Log out</button>
        </header>

        {activeToken && (
          <section style={{ ...cardStyle, marginTop: 20, background: '#f0fdf4' }}>
            <h2>Your active token</h2><h1 style={{ color: '#166534' }}>{activeToken.number}</h1>
            <p><strong>Shop:</strong> {activeToken.shopName}</p>
            <p><strong>Date:</strong> {activeToken.date}</p>
            <p><strong>Time slot:</strong> {activeToken.slot}</p>
            <div style={{ marginTop: 16, padding: 16, background: '#ffffff', borderRadius: 12, display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
              <QRCodeSVG value={activeToken.number} size={180} level="M" includeMargin />
              <strong>Scan to verify token</strong>
              <span style={{ color: '#64748b', fontSize: 12 }}>Show this QR code to the ration dealer.</span>
            </div>
          </section>
        )}

        <section style={{ ...cardStyle, marginTop: 20 }}>
          <h2>Raise a Complaint</h2>
          <p>
            Report ration distribution problems to the government grievance team.
            Keep your tracking ID to follow up.
          </p>

          <label htmlFor="complaint-shop">Select ration shop</label>
          <select
            id="complaint-shop"
            style={inputStyle}
            value={complaintShop}
            onChange={(event) => setComplaintShop(event.target.value)}
          >
            {shops.map((shop) => (
              <option key={shop.id} value={shop.id}>
                {shop.name} — {shop.village}
              </option>
            ))}
          </select>

          <label htmlFor="complaint-category">Complaint category</label>
          <select
            id="complaint-category"
            style={inputStyle}
            value={complaintCategory}
            onChange={(event) => setComplaintCategory(event.target.value)}
          >
            <option>Ration not provided</option>
            <option>Incorrect quantity</option>
            <option>Overcharging</option>
            <option>Dealer misconduct</option>
            <option>Stock unavailable</option>
            <option>Other</option>
          </select>

          <label htmlFor="complaint-description">
            Describe your problem
          </label>
          <textarea
            id="complaint-description"
            style={{ ...inputStyle, minHeight: 110, resize: 'vertical' }}
            maxLength={2000}
            placeholder="Explain what happened..."
            value={complaintDescription}
            onChange={(event) => setComplaintDescription(event.target.value)}
          />

          <button
            type="button"
            style={{
              ...buttonStyle,
              opacity: complaintSubmitting ? 0.7 : 1,
            }}
            disabled={complaintSubmitting}
            onClick={() => void submitComplaint()}
          >
            {complaintSubmitting ? 'Submitting...' : 'Submit Complaint'}
          </button>

          {complaintMessage && (
            <p role="status" style={{ overflowWrap: 'anywhere' }}>
              {complaintMessage}
            </p>
          )}
        </section>

        <section style={{ ...cardStyle, marginTop: 20 }}>
          <h2>My Complaints</h2>
          <p>Check your complaint tracking IDs and current status.</p>

          <button
            type="button"
            style={buttonStyle}
            disabled={complaintsLoading}
            onClick={() => void loadMyComplaints()}
          >
            {complaintsLoading ? 'Loading...' : 'View My Complaints'}
          </button>

          {myComplaints.length === 0 ? (
            <p>
              {complaintsLoading
                ? 'Loading complaints...'
                : 'No complaints loaded yet. Select "View My Complaints" to check.'}
            </p>
          ) : (
            myComplaints.map((complaint) => (
              <div
                key={complaint.complaint_code}
                style={{
                  borderTop: '1px solid #e2e8f0',
                  padding: '14px 0',
                  overflowWrap: 'anywhere',
                }}
              >
                <h3>{complaint.complaint_code}</h3>
                <p><strong>Shop:</strong> {complaint.shop_code}</p>
                <p><strong>Category:</strong> {complaint.category}</p>
                <p><strong>Description:</strong> {complaint.description}</p>
                <p>
                  <strong>Status:</strong>{' '}
                  <span style={{ color: '#176b45' }}>
                    {complaint.status}
                  </span>
                </p>
                <p>
                  <strong>Official remarks:</strong>{' '}
                  {complaint.official_remarks || 'No response yet.'}
                </p>
              </div>
            ))
          )}
        </section>

        <section style={{ ...cardStyle, marginTop: 20 }}>
          <h2>Find a ration shop</h2>
          <input style={inputStyle} placeholder="Search by shop name or village..." value={search} onChange={(event) => setSearch(event.target.value)} />
        </section>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(270px, 1fr))', gap: 20, marginTop: 20 }}>
          {filteredShops.map((shop) => (
            <section key={shop.id} style={cardStyle}>
              <h2>{shop.name}</h2><p>{shop.village} · {shop.distance}</p>
              <p><strong>Opening hours:</strong> {shop.hours}</p>
              <p><strong>Crowd level:</strong> {shop.crowd}</p>
              <h3>Available stock</h3>
              {shop.stock.map((item) => (
                <div key={item.name} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, padding: '8px 0', borderTop: '1px solid #e2e8f0' }}>
                  <span>{item.name}</span>
                  <span style={{ textAlign: 'right' }}><strong>{item.quantity} kg</strong><br /><small>{getStockStatus(item.quantity)}</small></span>
                </div>
              ))}
              <button style={{ ...buttonStyle, width: '100%', marginTop: 12 }} onClick={() => {
                setBookingShop(shop.id); setBookingDate(''); setBookingMessage(''); setShowBooking(true);
              }}>Book a token</button>
              {shop.stock.some((item) => item.quantity === 0) && (
                <button style={{ ...buttonStyle, width: '100%', marginTop: 8, background: '#475569' }} onClick={() => notifyWhenAvailable(shop)}>
                  Notify me when stock is available
                </button>
              )}
            </section>
          ))}
        </div>

        {showBooking && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: 16, zIndex: 1000 }}>
            <section style={{ ...cardStyle, width: '100%', maxWidth: 430 }}>
              <h2>Book a ration token</h2>
              <label htmlFor="booking-shop">Select shop</label>
              <select id="booking-shop" style={inputStyle} value={bookingShop} onChange={(event) => setBookingShop(event.target.value)}>
                {shops.map((shop) => <option key={shop.id} value={shop.id}>{shop.name} — {shop.village}</option>)}
              </select>
              <label htmlFor="booking-date">Select date</label>
              <input id="booking-date" type="date" min={today} style={inputStyle} value={bookingDate} onChange={(event) => setBookingDate(event.target.value)} />
              <label htmlFor="booking-slot">Select time slot</label>
              <select id="booking-slot" style={inputStyle} value={bookingSlot} onChange={(event) => setBookingSlot(event.target.value)}>
                <option>9:00 AM – 11:00 AM</option><option>11:00 AM – 1:00 PM</option>
                <option>1:00 PM – 3:00 PM</option><option>3:00 PM – 5:00 PM</option>
              </select>
              {bookingMessage && <p style={{ color: '#b91c1c' }}>{bookingMessage}</p>}
              <div style={{ display: 'flex', gap: 10 }}>
                <button style={{ ...buttonStyle, flex: 1 }} onClick={bookToken}>Confirm booking</button>
                <button style={{ ...buttonStyle, flex: 1, background: '#64748b' }} onClick={() => { setShowBooking(false); setBookingMessage(''); }}>Cancel</button>
              </div>
            </section>
          </div>
        )}

        <section style={{ ...cardStyle, marginTop: 20 }}>
          <h2>Notifications</h2>
          {notifications.length === 0 ? <p>No notifications yet.</p> : <ul>{notifications.map((message, index) => <li key={`${message}-${index}`}>{message}</li>)}</ul>}
        </section>
        <p style={{ color: '#64748b', fontSize: 13, marginTop: 24 }}>Demo data only. Not an official government service.</p>
      </main>
    );
  }

  return (
    <main style={pageStyle}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <h2 style={{ color: '#176b45' }}>Smart Ration Queue</h2>
        <select aria-label="Select language" value={language} onChange={(event) => setLanguage(event.target.value as 'English' | 'தமிழ்')} style={{ ...inputStyle, width: 130, margin: 0 }}>
          <option value="English">English</option><option value="தமிழ்">தமிழ்</option>
        </select>
      </header>

      <section style={{ padding: '50px 0 35px', textAlign: 'center' }}>
        <h1 style={{ fontSize: 'clamp(30px, 5vw, 48px)' }}>
          {language === 'தமிழ்' ? 'ஸ்மார்ட் ரேஷன் வரிசை' : 'Smart Ration Queue and Stock Management'}
        </h1>
        <p style={{ color: '#64748b', fontSize: 18 }}>
          {language === 'தமிழ்' ? 'வரிசையில் காத்திருக்கும் நேரத்தைக் குறைத்து, இருப்பை அறியுங்கள்.' : 'Check ration stock, reduce waiting time, and plan your visit.'}
        </p>
      </section>

      {!selectedRole ? (
        <section>
          <h2 style={{ textAlign: 'center' }}>Choose your role</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 20, marginTop: 24 }}>
            {([
              { role: 'consumer', title: 'Consumer', description: 'Check stock and book a ration token.' },
              { role: 'dealer', title: 'Ration Dealer', description: 'Manage shop stock and availability.' },
              { role: 'official', title: 'Government Official', description: 'Monitor stock across demo shops.' },
            ] as const).map((item) => (
              <button key={item.role} onClick={() => { setSelectedRole(item.role); setLoginMessage(''); }} style={{ ...cardStyle, textAlign: 'left', cursor: 'pointer', color: '#0f172a' }}>
                <h2>{item.title}</h2><p>{item.description}</p><strong style={{ color: '#176b45' }}>Continue →</strong>
              </button>
            ))}
          </div>
        </section>
      ) : (
        <section style={{ ...cardStyle, maxWidth: 440, margin: '0 auto' }}>
          <h2>{selectedRole === 'consumer' ? 'Consumer Login' : selectedRole === 'dealer' ? 'Ration Dealer Login' : 'Government Official Login'}</h2>
          {selectedRole === 'consumer' ? (
            <>
              <p style={{ color: '#64748b' }}>Demo login only — no SMS or Twilio is used. Use OTP 123456.</p>
              <form onSubmit={(event) => { event.preventDefault(); loginConsumerWithDummyOtp(); }}>
                <label htmlFor="consumer-phone">10-digit phone number</label>
                <input id="consumer-phone" type="tel" inputMode="numeric" autoComplete="tel-national" required maxLength={10} pattern="[0-9]{10}" style={inputStyle} placeholder="Enter phone number" value={consumerPhone} onChange={(event) => setConsumerPhone(event.target.value.replace(/\D/g, '').slice(0, 10))} />
                <label htmlFor="ration-card">Ration card number</label>
                <input id="ration-card" required style={inputStyle} placeholder="Enter ration card number" value={rationCardNumber} onChange={(event) => setRationCardNumber(event.target.value)} />
                <label htmlFor="consumer-otp">Demo OTP</label>
                <input id="consumer-otp" inputMode="numeric" required maxLength={6} style={inputStyle} placeholder="Enter 123456" value={consumerOtp} onChange={(event) => setConsumerOtp(event.target.value.replace(/\D/g, '').slice(0, 6))} />
                <button type="submit" style={{ ...buttonStyle, width: '100%' }}>Open consumer dashboard</button>
              </form>
            </>
          ) : (
            <>
              <p style={{ color: '#64748b' }}>Sign in with your registered Supabase email and password.</p>
              <form onSubmit={(event) => { event.preventDefault(); void loginWithPassword(); }}>
                <label htmlFor="login-email">Email address</label>
                <input id="login-email" type="email" autoComplete="username" required style={inputStyle} placeholder="Enter your email" value={email} onChange={(event) => setEmail(event.target.value)} />
                <label htmlFor="login-password">Password</label>
                <input id="login-password" type="password" autoComplete="current-password" required style={inputStyle} placeholder="Enter your password" value={password} onChange={(event) => setPassword(event.target.value)} />
                <button type="submit" disabled={loginMessage === 'Signing in...'} style={{ ...buttonStyle, width: '100%', opacity: loginMessage === 'Signing in...' ? 0.7 : 1 }}>
                  {loginMessage === 'Signing in...' ? 'Signing in...' : 'Sign in'}
                </button>
              </form>
            </>
          )}
          {loginMessage && <p role="status" style={{ color: '#b91c1c', marginTop: 12 }}>{loginMessage}</p>}
          <button type="button" style={{ ...buttonStyle, background: '#64748b', width: '100%', marginTop: 12 }} onClick={() => { setSelectedRole(null); setPassword(''); setConsumerOtp(''); setLoginMessage(''); }}>Back</button>
          <p style={{ color: '#64748b', fontSize: 12, marginTop: 16 }}>
            {selectedRole === 'consumer' ? 'Demo login only: use OTP 123456. Consumer tokens are stored through Supabase for this demo.' : 'Use a registered Supabase account. Access depends on the role assigned to that account in the database.'}
          </p>
        </section>
      )}

      <footer style={{ textAlign: 'center', marginTop: 48, padding: '20px 0', color: '#64748b', borderTop: '1px solid #e2e8f0', fontSize: 13 }}>
        Demo data only. Not an official government service.
      </footer>
    </main>
  );
}

type OfficialComplaint = {
  complaint_code: string;
  shop_code: string;
  category: string;
  description: string;
  status: string;
  official_remarks: string | null;
  created_at: string;
};

function OfficialComplaintCard({
  complaint,
  cardStyle,
  inputStyle,
  buttonStyle,
  updating,
  onUpdate,
}: {
  complaint: OfficialComplaint;
  cardStyle: React.CSSProperties;
  inputStyle: React.CSSProperties;
  buttonStyle: React.CSSProperties;
  updating: boolean;
  onUpdate: (
    complaintCode: string,
    status: string,
    remarks: string
  ) => Promise<void>;
}) {
  const [status, setStatus] = useState(complaint.status);
  const [remarks, setRemarks] = useState(
    complaint.official_remarks ?? ''
  );

  return (
    <article
      style={{
        ...cardStyle,
        marginTop: 16,
        boxShadow: 'none',
        background: '#f8fafc',
      }}
    >
      <h3>{complaint.complaint_code}</h3>
      <p><strong>Shop:</strong> {complaint.shop_code}</p>
      <p><strong>Category:</strong> {complaint.category}</p>
      <p><strong>Description:</strong> {complaint.description}</p>
      <p>
        <strong>Submitted:</strong>{' '}
        {new Date(complaint.created_at).toLocaleString()}
      </p>

      <label htmlFor={`status-${complaint.complaint_code}`}>
        Complaint status
      </label>
      <select
        id={`status-${complaint.complaint_code}`}
        style={inputStyle}
        value={status}
        onChange={(event) => setStatus(event.target.value)}
      >
        <option>Pending</option>
        <option>Under Review</option>
        <option>Action Taken</option>
        <option>Resolved</option>
        <option>Rejected</option>
      </select>

      <label htmlFor={`remarks-${complaint.complaint_code}`}>
        Official remarks
      </label>
      <textarea
        id={`remarks-${complaint.complaint_code}`}
        style={{ ...inputStyle, minHeight: 80 }}
        maxLength={2000}
        placeholder="Enter action taken or response to the consumer..."
        value={remarks}
        onChange={(event) => setRemarks(event.target.value)}
      />

      <button
        type="button"
        style={{
          ...buttonStyle,
          opacity: updating ? 0.7 : 1,
        }}
        disabled={updating}
        onClick={() =>
          void onUpdate(complaint.complaint_code, status, remarks)
        }
      >
        {updating ? 'Saving...' : 'Save Update'}
      </button>
    </article>
  );
}

export default App;                                              