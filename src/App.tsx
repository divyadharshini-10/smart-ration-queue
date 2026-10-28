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
type Token = {
  number: string;
  queueNumber: number | null;
  shopName: string;
  shopCode: string;
  date: string;
  slot: string;
  status: string;
};

type QueueEntry = {
  queue_number: number;
  status: string;
};
type FamilyMember = {
  id: string;
  full_name: string;
  relationship: string;
};

function getStockStatus(quantity: number) {
  if (quantity === 0) return 'Out of stock';
  if (quantity < 20) return 'Low stock';
  return 'In stock';
}

// Items handed out at distribution time, in display order.
const distributionItemNames = ['Rice', 'Sugar', 'Wheat', 'Toor dal', 'Oil'];

// Oil is measured in litres; every other item is measured in kg.
function getUnit(itemName: string) {
  return itemName === 'Oil' ? 'litre' : 'kg';
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
  const [publicQueue, setPublicQueue] = useState<QueueEntry[]>([]);
  const [queueMessage, setQueueMessage] = useState('');
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
  const [paymentMethod, setPaymentMethod] =
    useState<'cash' | 'upi'>('cash');
  const [receipt, setReceipt] = useState<any>(null);
  // Preview-only mode is enabled by default and never calls a Supabase redemption RPC.
  const [previewOnlyMode, setPreviewOnlyMode] = useState(false);
  const [itemPrices, setItemPrices] =
    useState<Record<string, number>>({});
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [selectedFamilyMemberId, setSelectedFamilyMemberId] = useState('');
  const [familyMembersLoading, setFamilyMembersLoading] = useState(false);
  const [officialShopSearch, setOfficialShopSearch] = useState('');
  const [stockFilter, setStockFilter] = useState<'all' | 'low' | 'out'>('all');
  const [complaintStatusFilter, setComplaintStatusFilter] = useState('All');
  const [officialFeedback, setOfficialFeedback] = useState('');
  const [resettingTokens, setResettingTokens] = useState(false);
  const [resetTokensMessage, setResetTokensMessage] = useState('');

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

        const verifiedCode = result.token_code ?? tokenCode.trim();

        setScannedTokenCode(verifiedCode);
        setDistributionItems({});
        setDistributionMessage('');
        setReceipt(null);
        setScanResult(result.message ?? 'Token verified successfully.');

        await loadTokenFamilyMembers(verifiedCode);
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

  // Load monitoring data automatically when an official signs in.
  useEffect(() => {
    if (loggedIn && selectedRole === 'official') {
      void loadRationMonitoring();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loggedIn, selectedRole]);

  // Refresh the public queue every 5 seconds.
  useEffect(() => {
    if (!activeToken?.shopCode || !activeToken.date || !activeToken.slot) {
      setPublicQueue([]);
      return;
    }

    let cancelled = false;

    async function refreshQueue() {
      const { data, error } = await supabase.rpc('get_public_ration_queue', {
        p_shop_code: activeToken!.shopCode,
        p_token_date: activeToken!.date,
        p_time_slot: activeToken!.slot,
      });

      if (cancelled) return;

      if (error) {
        setQueueMessage('Unable to refresh the queue. Please try again.');
        return;
      }

      setPublicQueue((data ?? []) as QueueEntry[]);
      setQueueMessage('');
    }

    void refreshQueue();

    const intervalId = window.setInterval(() => {
      void refreshQueue();
    }, 5000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [activeToken?.shopCode, activeToken?.date, activeToken?.slot]);

  async function loadTokenFamilyMembers(tokenCode: string) {
    console.log('[Family] Loading started:', tokenCode);

    setFamilyMembers([]);
    setSelectedFamilyMemberId('');
    setFamilyMembersLoading(true);

    try {
      const { data, error } = await supabase.rpc(
        'get_token_family_members',
        { p_token_code: tokenCode.trim() }
      );

      console.log('[Family] RPC data:', data);
      console.log('[Family] RPC error:', error);

      if (error) throw error;

      const members = Array.isArray(data)
        ? (data as FamilyMember[])
        : [];

      console.log('[Family] Member count:', members.length);

      setFamilyMembers(members);

      if (members.length === 0) {
        setDistributionMessage(
          'No family members returned by Supabase for this token.'
        );
      } else {
        setDistributionMessage(
          `${members.length} family member(s) loaded successfully.`
        );
      }
    } catch (error) {
      console.error('[Family] Loading failed:', error);

      setDistributionMessage(
        error instanceof Error
          ? `Could not load family members: ${error.message}`
          : 'Could not load family members.'
      );
    } finally {
      console.log('[Family] Loading finished');
      setFamilyMembersLoading(false);
    }
  }

  async function loadItemPrices() {
    const { data, error } = await supabase
      .from('ration_item_prices')
      .select('item_name, price_per_kg');

    if (error) {
      console.error('Could not load item prices:', error.message);
      return;
    }

    const prices: Record<string, number> = {};

    for (const item of data ?? []) {
      prices[item.item_name] = Number(item.price_per_kg);
    }

    // Rice and wheat are always free.
    prices['Rice'] = 0;
    prices['Wheat'] = 0;

    setItemPrices(prices);
  }

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
    void loadItemPrices();
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
    setPublicQueue([]);
    setQueueMessage('');
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

    if (!selectedFamilyMemberId) {
      setDistributionMessage(
        'Please select the family member collecting the ration.'
      );
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

    // This branch is intentionally local-only: no token lookup, redemption, stock update,
    // monthly-usage update, or receipt insert is performed in preview-only mode.
    if (previewOnlyMode) {
      const lineItems = items.map((item) => {
        const unitPrice = item.item_name === 'Oil' ? 25 : 0;
        return {
          item_name: item.item_name,
          quantity_kg: item.quantity_kg,
          price_per_kg: unitPrice,
          line_total: item.quantity_kg * unitPrice,
        };
      });
      const total = lineItems.reduce((sum, item) => sum + item.line_total, 0);
      const sampleReceipt = {
        success: true,
        preview_only: true,
        receipt_code: `SAMPLE-${new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14)}`,
        token_code: scannedTokenCode,
        collected_by_member_id: selectedFamilyMemberId,
        collected_by_member_name:
          familyMembers.find(
            (member) => member.id === selectedFamilyMemberId
          )?.full_name ?? 'Demo family member',
        payment_method: paymentMethod,
        payment_status: 'sample_only',
        total_amount: total,
        items: lineItems,
        created_at: new Date().toISOString(),
      };
      setReceipt(sampleReceipt);
      setDistributionMessage(`SAMPLE receipt created locally. Total ₹${total.toFixed(2)}. No token was redeemed and no stock was changed.`);
      return;
    }

    setDistributionSubmitting(true);
    setDistributionMessage('Recording distribution...');

    try {
      const { data, error } = await supabase.rpc(
        'confirm_distribution_with_receipt',
        {
          p_token_code: scannedTokenCode,
          p_items: items,
          p_payment_method: paymentMethod,
          p_collected_by_member_id: selectedFamilyMemberId,
        }
      );

      if (error) throw error;
      if (!data?.success) {
        throw new Error(data?.message ?? 'Distribution failed.');
      }

      setReceipt(data);
      setDistributionMessage(
        `Receipt ${data.receipt_code} created. Total ₹${Number(data.total_amount).toFixed(2)}. Payment: ${data.payment_status}.`
      );

      setScanResult(`Token ${scannedTokenCode} redeemed successfully.`);
      setScannedTokenCode('');
      setDistributionItems({});
      setSelectedFamilyMemberId('');
      setFamilyMembers([]);

      await loadStock();
      setScannerOpen(true);
    } catch (error: unknown) {
      console.error('Distribution failed:', error);

      const message =
        error instanceof Error
          ? error.message
          : typeof error === 'object' &&
              error !== null &&
              'message' in error &&
              typeof error.message === 'string'
            ? error.message
            : JSON.stringify(error);

      setDistributionMessage(
        `Distribution failed: ${message || 'Unknown error'}`
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
          p_family_member_id: null,
        }
      );

      if (error) throw error;

      if (!data?.token) {
        throw new Error('No token was returned by the server.');
      }

      const token: Token = {
        number: data.token.number,
        queueNumber: data.token.queueNumber ?? null,
        shopName: data.token.shopName,
        shopCode: data.token.shopCode ?? bookingShop,
        date: data.token.date,
        slot: data.token.slot,
        status: data.token.status ?? 'waiting',
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

  async function resetTestTokens() {
    const confirmed = window.confirm(
      'Delete ALL test tokens, receipts, issued history and monthly usage? User accounts, shops and stock quantities are kept. This cannot be undone.'
    );

    if (!confirmed) return;

    setResettingTokens(true);
    setResetTokensMessage('');

    try {
      const { data, error } = await supabase.rpc('reset_demo_tokens');

      if (error) throw error;

      setResetTokensMessage(
        data?.message ?? 'All test tokens have been reset.'
      );

      setActiveToken(null);
      await loadRationMonitoring();
    } catch (error) {
      console.error('Token reset failed:', error);

      const message =
        error instanceof Error
          ? error.message
          : typeof error === 'object' &&
              error !== null &&
              'message' in error &&
              typeof error.message === 'string'
            ? error.message
            : JSON.stringify(error);

      setResetTokensMessage(`Reset failed: ${message || 'Unknown error'}`);
    } finally {
      setResettingTokens(false);
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
    const distributionTotal = Object.entries(distributionItems)
      .reduce((total, [itemName, value]) => {
        const quantity = Number(value);
        if (!value.trim() || !Number.isFinite(quantity) || quantity <= 0) {
          return total;
        }

        return total + quantity * (itemPrices[itemName] ?? 0);
      }, 0);
    return (
      <main style={pageStyle}>
        <style>{`@media print { body * { visibility: hidden !important; } #ration-receipt, #ration-receipt * { visibility: visible !important; } #ration-receipt { position: absolute; left: 0; top: 0; width: 100%; padding: 20px; box-sizing: border-box; color: #111827; background: white; } }`}</style>
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
          <h2>Dealer QR / Distribution Test</h2>
          <div style={{ padding: 14, borderRadius: 10, background: previewOnlyMode ? '#fff7ed' : '#fef2f2', border: `1px solid ${previewOnlyMode ? '#fdba74' : '#fca5a5'}`, marginBottom: 14 }}>
            <strong>{previewOnlyMode ? 'PREVIEW-ONLY MODE — SAFE LOCAL TEST' : 'LIVE DISTRIBUTION MODE'}</strong>
            <p style={{ marginBottom: 8 }}>{previewOnlyMode
              ? 'The Confirm button creates a sample receipt in this browser only. It does not call Supabase or redeem tokens, update stock, or write receipt records.'
              : 'Live mode can redeem tokens and change database stock/usage. Use only when intentionally processing a real distribution.'}</p>
            <button type="button" style={{ ...buttonStyle, background: previewOnlyMode ? '#9a3412' : '#991b1b' }} onClick={() => {
              const next = !previewOnlyMode;
              if (next) {
                setPreviewOnlyMode(true);
                setReceipt(null);
                setScannedTokenCode('');
                setDistributionItems({});
                setDistributionMessage('Preview-only mode enabled. Use the sample token button below.');
              } else if (window.confirm('Switch to LIVE distribution mode? Confirming distribution can redeem a token and update Supabase stock and usage. Continue only if you intend to process real distributions.')) {
                setPreviewOnlyMode(false);
                setReceipt(null);
                setScannedTokenCode('');
                setDistributionItems({});
                setDistributionMessage('Live mode enabled. Be careful: confirmation writes to Supabase.');
              }
            }}>{previewOnlyMode ? 'Switch to live mode…' : 'Return to preview-only mode'}</button>
          </div>
          {previewOnlyMode && (
            <button type="button" style={{ ...buttonStyle, background: '#9a3412', marginBottom: 12 }} onClick={() => {
              setScannerOpen(false);
              setScanResult('Sample token loaded locally. No database lookup was performed.');
              setScannedTokenCode('SAMPLE-TOKEN-001');
              setFamilyMembers([]);
              setSelectedFamilyMemberId('');
              setDistributionItems({ Rice: '10', Sugar: '5', Wheat: '5', 'Toor dal': '2', Oil: '1.5' });
              setReceipt(null);
              setDistributionMessage('Edit quantities if needed, then create a sample receipt. Nothing will be redeemed.');
            }}>Load sample token + quantities</button>
          )}
          {!previewOnlyMode && <p>Scan the QR code displayed on the consumer's active ration token to verify it.</p>}
          {!previewOnlyMode && (!scannerOpen ? (
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
          ))}
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

              <div style={{ marginBottom: 20 }}>
                <label htmlFor="collector-member">
                  <strong>Family member collecting the ration</strong>
                </label>

                <select
                  id="collector-member"
                  style={inputStyle}
                  value={selectedFamilyMemberId}
                  disabled={familyMembersLoading || familyMembers.length === 0}
                  onChange={(event) =>
                    setSelectedFamilyMemberId(event.target.value)
                  }
                >
                  <option value="">
                    {familyMembersLoading
                      ? 'Loading family members...'
                      : familyMembers.length === 0
                        ? 'No family members available'
                        : 'Select the collecting family member'}
                  </option>

                  {familyMembers.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.full_name} — {member.relationship}
                    </option>
                  ))}
                </select>

                <p style={{ color: '#64748b', fontSize: 13 }}>
                  Select the person physically collecting the ration.
                  Household ration entitlement remains unchanged.
                </p>
              </div>

              {distributionItemNames.map((item) => {
                const available =
                  dealerShops[0]?.stock.find((stock) => stock.name === item)?.quantity ?? 0;
                const unit = getUnit(item);

                return (
                  <div key={item} style={{ marginBottom: 12 }}>
                    <label htmlFor={`issue-${item}`}>{item} (available: {available} {unit})</label>
                    <input
                      id={`issue-${item}`}
                      type="number"
                      min="0"
                      max={available}
                      step="0.01"
                      style={inputStyle}
                      value={distributionItems[item] ?? ''}
                      placeholder={`Quantity to issue in ${unit}`}
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

              <h3>Distribution bill</h3>

              {distributionItemNames.map((item) => {
                const quantity = Number(distributionItems[item] ?? 0);
                const price = itemPrices[item] ?? 0;
                const unit = getUnit(item);

                return (
                  <p key={item}>
                    {item}: ₹{price.toFixed(2)}/{unit}
                    {' × '}
                    {quantity} {unit} = ₹{(quantity * price).toFixed(2)}
                  </p>
                );
              })}

              <h3>Total: ₹{distributionTotal.toFixed(2)}</h3>

              <label htmlFor="payment-method">Payment method</label>

              <select
                id="payment-method"
                style={inputStyle}
                value={paymentMethod}
                onChange={(event) =>
                  setPaymentMethod(event.target.value as 'cash' | 'upi')
                }
              >
                <option value="cash">Cash</option>
                <option value="upi">UPI (demo)</option>
              </select>

              {paymentMethod === 'upi' && (
                <div style={{ textAlign: 'center', padding: 16 }}>
                  <h3>Demo UPI Payment</h3>
                  <p>Amount: ₹{distributionTotal.toFixed(2)}</p>
                  <QRCodeSVG
                    value={`SMART-RATION-DEMO|TOKEN:${scannedTokenCode}|AMOUNT:${distributionTotal.toFixed(2)}`}
                    size={180}
                    level="M"
                  />
                  <p>
                    Demo QR for presentation only. No real payment is processed.
                  </p>
                </div>
              )}

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
                  setSelectedFamilyMemberId('');
                  setFamilyMembers([]);
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

        {receipt && (
          <section style={{ ...cardStyle, marginTop: 20 }}>
            <div id="ration-receipt">
              {receipt.preview_only && <div style={{ border: '3px dashed #c2410c', color: '#c2410c', padding: 10, textAlign: 'center', fontWeight: 800, fontSize: 18, marginBottom: 14 }}>SAMPLE ONLY — NOT A REAL DISTRIBUTION RECEIPT</div>}
              <h2>Smart Ration Queue</h2>
              <h3>{receipt.preview_only ? 'Sample Ration Receipt (Preview Only)' : 'Ration Distribution Receipt'}</h3>

              <p><strong>Receipt:</strong> {receipt.receipt_code}</p>
              <p><strong>Token:</strong> {receipt.token_code}</p>
              <p>
                <strong>Collected by:</strong>{' '}
                {receipt.collected_by_member_name ?? 'Not recorded'}
              </p>
              <p>
                <strong>Payment:</strong> {receipt.payment_method.toUpperCase()}
              </p>
              <p>
                <strong>Status:</strong> {receipt.payment_status === 'paid'
                  ? 'Paid (demo)'
                  : 'UPI pending — demo only'}
              </p>
              {Array.isArray(receipt.items) && (
                <table style={{ width: '100%', borderCollapse: 'collapse', margin: '16px 0' }}>
                  <thead><tr><th style={{ textAlign: 'left', borderBottom: '1px solid #cbd5e1', padding: 8 }}>Item</th><th style={{ textAlign: 'right', borderBottom: '1px solid #cbd5e1', padding: 8 }}>Quantity</th><th style={{ textAlign: 'right', borderBottom: '1px solid #cbd5e1', padding: 8 }}>Rate</th><th style={{ textAlign: 'right', borderBottom: '1px solid #cbd5e1', padding: 8 }}>Amount</th></tr></thead>
                  <tbody>{receipt.items.map((item: any) => <tr key={item.item_name}><td style={{ padding: 8, borderBottom: '1px solid #e2e8f0' }}>{item.item_name}</td><td style={{ padding: 8, textAlign: 'right', borderBottom: '1px solid #e2e8f0' }}>{item.quantity_kg} {getUnit(item.item_name)}</td><td style={{ padding: 8, textAlign: 'right', borderBottom: '1px solid #e2e8f0' }}>₹{Number(item.price_per_kg).toFixed(2)}/{getUnit(item.item_name)}</td><td style={{ padding: 8, textAlign: 'right', borderBottom: '1px solid #e2e8f0' }}>₹{Number(item.line_total ?? (item.quantity_kg * item.price_per_kg)).toFixed(2)}</td></tr>)}</tbody>
                </table>
              )}
              <h3>Total: ₹{Number(receipt.total_amount).toFixed(2)}</h3>
              {receipt.preview_only && <p><strong>Safety:</strong> This sample was generated in browser memory only. No Supabase RPC was called; no token, stock, usage, or receipt record was changed.</p>}
              <p>Thank you. Please keep this receipt for your records.</p>
            </div>

            <button
              type="button"
              style={buttonStyle}
              onClick={() => window.print()}
            >
              {receipt.preview_only ? 'Print Sample Receipt' : 'Print Receipt'}
            </button>
          </section>
        )}

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
                      <span>{getUnit(item.name)}</span>
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
    // Oil is measured in litres, so it is totalled separately from the kg items.
    const totalStockKg = shops.reduce((total, shop) => total + shop.stock.filter((item) => item.name !== 'Oil').reduce((sum, item) => sum + item.quantity, 0), 0);
    const totalOilLitres = shops.reduce((total, shop) => total + shop.stock.filter((item) => item.name === 'Oil').reduce((sum, item) => sum + item.quantity, 0), 0);
    const lowStockItems = shops.reduce((total, shop) => total + shop.stock.filter((item) => item.quantity > 0 && item.quantity < 20).length, 0);
    const outOfStockItems = shops.reduce((total, shop) => total + shop.stock.filter((item) => item.quantity === 0).length, 0);

    const stockFilterMatches = (quantity: number) =>
      stockFilter === 'all'
        ? true
        : stockFilter === 'low'
          ? quantity > 0 && quantity < 20
          : quantity === 0;

    const officialVisibleShops = shops.filter((shop) => {
      const text = officialShopSearch.trim().toLowerCase();
      const matchesSearch =
        !text ||
        shop.name.toLowerCase().includes(text) ||
        shop.village.toLowerCase().includes(text) ||
        shop.id.toLowerCase().includes(text);
      const matchesStock =
        stockFilter === 'all' || shop.stock.some((item) => stockFilterMatches(item.quantity));
      return matchesSearch && matchesStock;
    });

    const scrollToSection = (id: string) =>
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

    return (
      <main style={pageStyle} className="gov-dashboard">
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <h1>GOVERNMENT OFFICIAL DASHBOARD</h1>
            <p>Overview of stock across all demo ration shops.</p>
            <p style={{ color: '#64748b', fontSize: 13 }}>{stockMessage}</p>
          </div>
          <button style={buttonStyle} onClick={logout}>Log out</button>
        </header>
        <div className="gov-stat-grid">
          <button
            type="button"
            className="gov-stat-card"
            onClick={() => {
              setStockFilter('all');
              setOfficialShopSearch('');
              setOfficialFeedback(`Showing all ${shops.length} shops.`);
              scrollToSection('official-shops');
            }}
          >
            <span className="gov-stat-label">Total shops</span>
            <span className="gov-stat-number">{shops.length}</span>
            <span className="gov-stat-hint">View shop records →</span>
          </button>

          <button
            type="button"
            className="gov-stat-card gov-stat-card--dark"
            onClick={() => {
              setOfficialFeedback(
                `Total stock: ${totalStockKg.toLocaleString('en-IN')} kg of grains, sugar and dal, plus ${totalOilLitres.toLocaleString('en-IN')} litres of oil.`
              );
              scrollToSection('official-monitoring');
            }}
          >
            <span className="gov-stat-label">Total stock (kg)</span>
            <span className="gov-stat-number">{totalStockKg.toLocaleString('en-IN')}</span>
            <span className="gov-stat-hint">
              + {totalOilLitres.toLocaleString('en-IN')} litres oil · View monitoring →
            </span>
          </button>

          <button
            type="button"
            className="gov-stat-card"
            onClick={() => {
              setStockFilter('low');
              setOfficialFeedback(`Showing shops with low-stock items (${lowStockItems} items below 20).`);
              scrollToSection('official-shops');
            }}
          >
            <span className="gov-stat-label">Low-stock items</span>
            <span className="gov-stat-number">{lowStockItems}</span>
            <span className="gov-stat-hint">Investigate shortages →</span>
          </button>

          <button
            type="button"
            className="gov-stat-card"
            onClick={() => {
              setStockFilter('out');
              setOfficialFeedback(`Showing shops with out-of-stock items (${outOfStockItems} items).`);
              scrollToSection('official-shops');
            }}
          >
            <span className="gov-stat-label">Out-of-stock items</span>
            <span className="gov-stat-number">{outOfStockItems}</span>
            <span className="gov-stat-hint">Review unavailable items →</span>
          </button>
        </div>
        {officialFeedback && (
          <p className="gov-feedback" role="status" aria-live="polite">{officialFeedback}</p>
        )}
        <section id="official-monitoring" className="gov-panel" style={{ ...cardStyle, marginTop: 24 }}>
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
                <p>{item.item_name}: {item.quantity_kg} {getUnit(item.item_name)}</p>
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
                <p>{item.item_name}: {item.quantity_kg} {getUnit(item.item_name)}</p>
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

          <label htmlFor="complaint-status-filter" style={{ display: 'block', marginTop: 16 }}>
            Filter by status
          </label>
          <select
            id="complaint-status-filter"
            style={inputStyle}
            value={complaintStatusFilter}
            onChange={(event) => setComplaintStatusFilter(event.target.value)}
          >
            <option>All</option>
            <option>Pending</option>
            <option>Under Review</option>
            <option>Action Taken</option>
            <option>Resolved</option>
            <option>Rejected</option>
          </select>
          {officialComplaints.length > 0 && (
            <p role="status">
              Showing {officialComplaints.filter((complaint) => complaintStatusFilter === 'All' || complaint.status === complaintStatusFilter).length} of {officialComplaints.length} complaints.
            </p>
          )}

          {officialComplaints.filter((complaint) => complaintStatusFilter === 'All' || complaint.status === complaintStatusFilter).map((complaint) => (
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

        <div id="official-shops" className="gov-panel">
          <h2>Shop Records</h2>
          <p>Search shops and filter by stock level. Click a statistic above to apply a filter.</p>

          <label htmlFor="official-shop-search">Search by shop name, village or code</label>
          <input
            id="official-shop-search"
            style={inputStyle}
            placeholder="Search shops..."
            value={officialShopSearch}
            onChange={(event) => setOfficialShopSearch(event.target.value)}
          />

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
            {([
              ['all', 'All shops'],
              ['low', 'Low stock'],
              ['out', 'Out of stock'],
            ] as const).map(([value, label]) => (
              <button
                key={value}
                type="button"
                className={`gov-chip${stockFilter === value ? ' gov-chip--active' : ''}`}
                aria-pressed={stockFilter === value}
                onClick={() => {
                  setStockFilter(value);
                  setOfficialFeedback('');
                }}
              >
                {label}
              </button>
            ))}
          </div>

          <p role="status" aria-live="polite">
            Showing {officialVisibleShops.length} of {shops.length} shops
          </p>

          {officialVisibleShops.length === 0 && <p>No shops match the current search and filter.</p>}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(270px, 1fr))', gap: 20, marginTop: 12 }}>
            {officialVisibleShops.map((shop) => (
              <section key={shop.id} style={cardStyle}>
                <h2>{shop.name}</h2><p>{shop.village} · {shop.id}</p>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  {shop.stock.filter((item) => stockFilterMatches(item.quantity)).map((item) => {
                    const status = getStockStatus(item.quantity);
                    const badge = status === 'In stock' ? 'gov-badge--good' : status === 'Low stock' ? 'gov-badge--warning' : 'gov-badge--danger';
                    return (
                      <li key={item.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, padding: '8px 0', borderTop: '1px solid #f4e4eb' }}>
                        <span>{item.name}: <strong>{item.quantity} {getUnit(item.name)}</strong></span>
                        <span className={`gov-badge ${badge}`}>{status}</span>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>
        </div>

        <section
          style={{
            ...cardStyle,
            marginTop: 24,
            border: '1px solid #fecaca',
          }}
        >
          <h2>Developer Tools</h2>
          <p>
            Clear test tokens, receipts, issued history and monthly usage so
            you can test the booking and distribution flow from the beginning.
            Shop stock and user accounts are preserved.
          </p>

          <button
            type="button"
            style={{ ...buttonStyle, background: '#b91c1c' }}
            disabled={resettingTokens}
            onClick={() => void resetTestTokens()}
          >
            {resettingTokens ? 'Resetting tokens...' : 'Reset Test Tokens'}
          </button>

          {resetTokensMessage && (
            <p role="status" aria-live="polite">
              {resetTokensMessage}
            </p>
          )}
        </section>

        <p style={{ color: '#64748b', fontSize: 13, marginTop: 24 }}>Demo data only. Not an official government service.</p>
      </main>
    );
  }

  if (loggedIn && selectedRole === 'consumer') {
    return (
      <main className="consumer-dashboard" style={pageStyle}>
        <style>{`
          .consumer-dashboard {
            font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
            color: #17352c;
            max-width: 1180px !important;
            padding: 28px 22px 36px !important;
            background: linear-gradient(180deg, #f1fbf5 0%, #f8fbff 44%, #f8fafc 100%);
            min-height: 100vh;
          }
          .consumer-dashboard h1, .consumer-dashboard h2, .consumer-dashboard h3 { letter-spacing: -0.025em; }
          .consumer-dashboard > header {
            background: linear-gradient(120deg, #0b5138 0%, #13845b 58%, #29a878 100%);
            color: #fff !important; padding: 25px 28px; border-radius: 22px;
            box-shadow: 0 16px 35px rgba(14, 116, 74, .18); margin-bottom: 22px;
          }
          .consumer-dashboard > header h1 { margin: 0 0 8px; font-size: clamp(25px, 3.3vw, 34px); }
          .consumer-dashboard > header p { color: #e0f7e9 !important; margin: 5px 0; }
          .consumer-dashboard > header button { background: #fff !important; color: #116344 !important; border-radius: 999px !important; padding: 11px 19px !important; }
          .consumer-dashboard section:not(.complaint-card) {
            border-radius: 18px !important; border-color: #e0eee6 !important;
            box-shadow: 0 8px 24px rgba(19, 68, 48, .055) !important;
            transition: transform .18s ease, box-shadow .18s ease;
          }
          .consumer-dashboard section:not(.complaint-card):hover { box-shadow: 0 12px 28px rgba(19, 68, 48, .09) !important; }
          .consumer-dashboard button { transition: transform .15s ease, filter .15s ease; }
          .consumer-dashboard button:hover:not(:disabled) { filter: brightness(1.06); transform: translateY(-1px); }
          .consumer-dashboard input, .consumer-dashboard select, .consumer-dashboard textarea {
            border-radius: 11px !important; border-color: #cbded3 !important; font: inherit;
          }
          .consumer-dashboard input:focus, .consumer-dashboard select:focus, .consumer-dashboard textarea:focus {
            outline: 3px solid rgba(34, 160, 105, .15); border-color: #219568 !important;
          }
          .consumer-dashboard .complaint-card {
            padding: 16px 18px !important; border-radius: 16px !important;
            border: 1px solid #dce9f0 !important; background: #fff !important;
            box-shadow: 0 5px 18px rgba(31, 66, 90, .045) !important;
          }
          .consumer-dashboard .complaint-card h2 { font-size: 20px; margin: 0 0 8px; }
          .consumer-dashboard .complaint-card p { margin: 7px 0; font-size: 14px; line-height: 1.5; }
          .consumer-dashboard .complaint-card label { font-size: 13px; font-weight: 650; color: #34574a; }
          .consumer-dashboard .complaint-card textarea { min-height: 78px !important; }
          .consumer-dashboard .complaint-card input, .consumer-dashboard .complaint-card select,
          .consumer-dashboard .complaint-card textarea { margin-bottom: 8px !important; padding: 9px 11px !important; }
          .consumer-dashboard .complaint-card button { padding: 9px 14px !important; border-radius: 10px !important; }
          @media (max-width: 640px) {
            .consumer-dashboard { padding: 14px 12px 24px !important; }
            .consumer-dashboard > header { padding: 20px 17px; border-radius: 17px; }
            .consumer-dashboard .complaint-card { padding: 14px !important; }
          }
        `}</style>
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
            <div style={{
              marginTop: 16,
              padding: 16,
              background: '#ffffff',
              borderRadius: 12
            }}>
              <h3>Live Queue Status</h3>

              <p>
                <strong>Your queue number:</strong>{' '}
                {activeToken.queueNumber ?? 'Not assigned'}
              </p>

              <p>
                <strong>Currently serving:</strong>{' '}
                {publicQueue.find((item) => item.status === 'serving')
                  ?.queue_number ?? 'Not started yet'}
              </p>

              <p>
                <strong>People ahead:</strong>{' '}
                {activeToken.queueNumber == null
                  ? 'Unavailable'
                  : publicQueue.filter(
                      (item) =>
                        item.status === 'waiting' &&
                        item.queue_number < activeToken.queueNumber!
                    ).length}
              </p>

              <p>
                <strong>Your status:</strong>{' '}
                {activeToken.status ?? 'waiting'}
              </p>

              <p style={{ color: '#64748b', fontSize: 13 }}>
                Queue updates automatically every 5 seconds.
              </p>

              {queueMessage && (
                <p style={{ color: '#b91c1c' }}>{queueMessage}</p>
              )}
            </div>
            <div style={{ marginTop: 16, padding: 16, background: '#ffffff', borderRadius: 12, display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
              <QRCodeSVG value={activeToken.number} size={180} level="M" includeMargin />
              <strong>Scan to verify token</strong>
              <span style={{ color: '#64748b', fontSize: 12 }}>Show this QR code to the ration dealer.</span>
            </div>
          </section>
        )}

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
                  <span style={{ textAlign: 'right' }}><strong>{item.quantity} {getUnit(item.name)}</strong><br /><small>{getStockStatus(item.quantity)}</small></span>
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

        <section className="complaint-card" style={{ ...cardStyle, marginTop: 16 }}>
          <h2>📝 Raise a Complaint</h2>
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

        <section className="complaint-card" style={{ ...cardStyle, marginTop: 12 }}>
          <h2>📬 My Complaints</h2>
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