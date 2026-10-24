
import { useEffect, useRef, useState } from 'react';
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
  shopName: string;
  date: string;
  slot: string;
};

function getStockStatus(quantity: number) {
  if (quantity === 0) return 'Out of stock';
  if (quantity < 20) return 'Low stock';
  return 'In stock';
}

const initialShops: Shop[] = [
  {
    id: '001',
    name: 'Demo Fair Price Shop 001',
    village: 'Greenfield',
    distance: '0.8 km',
    hours: '9:00 AM – 5:00 PM',
    crowd: 'Low',
    stock: [
      { name: 'Rice', quantity: 180 },
      { name: 'Wheat', quantity: 65 },
      { name: 'Sugar', quantity: 8 },
      { name: 'Toor dal', quantity: 0 },
    ],
  },
  {
    id: '002',
    name: 'Demo Fair Price Shop 002',
    village: 'Lakeview',
    distance: '1.5 km',
    hours: '9:00 AM – 5:00 PM',
    crowd: 'Medium',
    stock: [
      { name: 'Rice', quantity: 120 },
      { name: 'Wheat', quantity: 40 },
      { name: 'Sugar', quantity: 35 },
      { name: 'Toor dal', quantity: 12 },
    ],
  },
  {
    id: '003',
    name: 'Demo Fair Price Shop 003',
    village: 'Hillview',
    distance: '2.1 km',
    hours: '9:00 AM – 4:30 PM',
    crowd: 'High',
    stock: [
      { name: 'Rice', quantity: 0 },
      { name: 'Wheat', quantity: 24 },
      { name: 'Sugar', quantity: 20 },
      { name: 'Toor dal', quantity: 18 },
    ],
  },
  {
    id: '004',
    name: 'Demo Fair Price Shop 004',
    village: 'Riverside',
    distance: '2.8 km',
    hours: '9:00 AM – 5:00 PM',
    crowd: 'Low',
    stock: [
      { name: 'Rice', quantity: 90 },
      { name: 'Wheat', quantity: 55 },
      { name: 'Sugar', quantity: 0 },
      { name: 'Toor dal', quantity: 22 },
    ],
  },
];

function App() {
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [email, setEmail] = useState('user01@gmail.com');
  const [password, setPassword] = useState('');
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

  const [stockMessage, setStockMessage] = useState(
    'Loading stock from database...',
  );
  const [stockDrafts, setStockDrafts] = useState<Record<string, string>>({});
  const [stockSaveMessage, setStockSaveMessage] = useState('');
  const [savingStockKey, setSavingStockKey] = useState<string | null>(null);
  const [assignedShopCode, setAssignedShopCode] = useState<string | null>(null);

  const [activeToken, setActiveToken] = useState<Token | null>(() => {
    try {
      const saved = localStorage.getItem('ration-active-token');
      return saved ? (JSON.parse(saved) as Token) : null;
    } catch {
      return null;
    }
  });

  const [showBooking, setShowBooking] = useState(false);
  const [bookingShop, setBookingShop] = useState('SHOP001');
  const [bookingDate, setBookingDate] = useState('');
  const [bookingSlot, setBookingSlot] = useState('9:00 AM – 11:00 AM');
  const [bookingMessage, setBookingMessage] = useState('');
  const [notifications, setNotifications] = useState<string[]>([]);
  const [language, setLanguage] = useState<'English' | 'தமிழ்'>('English');

  // Dealer QR scanner state
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannedToken, setScannedToken] = useState('');
  const [scanMessage, setScanMessage] = useState('');
  const [scanning, setScanning] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scanHandledRef = useRef(false);

  const today = new Date().toLocaleDateString('en-CA');

  const pageStyle: React.CSSProperties = {
    maxWidth: 1100,
    margin: '0 auto',
    padding: 24,
    boxSizing: 'border-box',
  };

  const cardStyle: React.CSSProperties = {
    border: '1px solid #e2e8f0',
    borderRadius: 14,
    padding: 20,
    background: '#ffffff',
    boxShadow: '0 3px 12px rgba(0,0,0,0.04)',
  };

  const buttonStyle: React.CSSProperties = {
    border: 'none',
    borderRadius: 8,
    padding: '10px 16px',
    background: '#176b45',
    color: '#ffffff',
    cursor: 'pointer',
    fontWeight: 600,
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    boxSizing: 'border-box',
    padding: 10,
    border: '1px solid #cbd5e1',
    borderRadius: 8,
    marginTop: 6,
    marginBottom: 12,
  };

  useEffect(() => {
    localStorage.setItem('ration-shops', JSON.stringify(shops));
  }, [shops]);

  // Stop the camera if this component is unmounted.
  useEffect(() => {
    return () => {
      const scanner = scannerRef.current;

      if (scanner?.isScanning) {
        void scanner.stop().catch((error) => {
          console.error('Could not stop QR scanner:', error);
        });
      }
    };
  }, []);

  async function loadStock() {
    const { data: shopData, error: shopError } = await supabase
      .from('shops')
      .select('id, shop_code, name, village');

    if (shopError) {
      console.error('Error loading shops:', shopError.message);
      setStockMessage(
        'Could not load database shops. Showing saved demo data.',
      );
      return;
    }

    const { data: stockData, error: stockError } = await supabase
      .from('stock_items')
      .select('shop_id, item_name, quantity_kg');

    if (stockError) {
      console.error('Error loading stock:', stockError.message);
      setStockMessage(
        'Could not load database stock. Showing saved demo data.',
      );
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
      const { data: shopData, error: shopError } = await supabase
        .from('shops')
        .select('id, shop_code, name, village');

      if (cancelled) return;

      if (shopError) {
        console.error('Error loading shops:', shopError.message);
        setStockMessage(
          'Could not load database shops. Showing saved demo data.',
        );
        return;
      }

      const { data: stockData, error: stockError } = await supabase
        .from('stock_items')
        .select('shop_id, item_name, quantity_kg');

      if (cancelled) return;

      if (stockError) {
        console.error('Error loading stock:', stockError.message);
        setStockMessage(
          'Could not load database stock. Showing saved demo data.',
        );
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

    void initialLoad();

    return () => {
      cancelled = true;
    };
  }, []);

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
      email: email.trim(),
      password,
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
      setLoginMessage(
        'No authorized profile was found for this account. Check user_profiles permissions and data.',
      );
      return;
    }

    if (profile.role !== selectedRole) {
      await supabase.auth.signOut();
      setLoginMessage(
        `This account is registered as ${profile.role}, not ${selectedRole}.`,
      );
      return;
    }

    if (profile.role === 'dealer' && !profile.shop_code) {
      await supabase.auth.signOut();
      setLoginMessage(
        'This dealer account has no assigned shop. Contact the administrator.',
      );
      return;
    }

    setAssignedShopCode(profile.shop_code ?? null);
    setLoggedIn(true);
    setLoginMessage('');
    setPassword('');
  }

  async function stopQrScanner() {
    const scanner = scannerRef.current;

    if (scanner) {
      try {
        if (scanner.isScanning) {
          await scanner.stop();
        }
        scanner.clear();
      } catch (error) {
        console.error('Error closing QR scanner:', error);
      }
    }

    scannerRef.current = null;
    setScanning(false);
    setScannerOpen(false);
  }

  async function startQrScanner() {
    setScanMessage('');
    setScannedToken('');
    scanHandledRef.current = false;
    setScannerOpen(true);
    setScanning(true);

    // Wait for the scanner element to appear in the page.
    window.setTimeout(async () => {
      const element = document.getElementById('dealer-qr-reader');

      if (!element) {
        setScanning(false);
        setScanMessage('Scanner could not be initialized. Please try again.');
        return;
      }

      const scanner = new Html5Qrcode('dealer-qr-reader');
      scannerRef.current = scanner;

      try {
        await scanner.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: { width: 220, height: 220 },
          },
          async (decodedText) => {
            if (scanHandledRef.current) return;
            scanHandledRef.current = true;

            setScannedToken(decodedText);
            setScanMessage('Verifying token with Supabase...');

            // Verify the scanned token using the secure database function.
            try {
              const { data, error } = await supabase.rpc(
                'verify_ration_token',
                {
                  p_token_code: decodedText.trim(),
                },
              );

              if (error) throw new Error(error.message);

              setScanMessage(
                data?.success
                  ? `✓ ${data.message} ${
                      data.time_slot
                        ? `Time slot: ${data.time_slot}`
                        : ''
                    }`
                  : `✗ ${
                      data?.message ?? 'Token verification failed.'
                    }`,
              );
            } catch (error) {
              console.error('Token verification failed:', error);

              setScanMessage(
                error instanceof Error
                  ? `Verification failed: ${error.message}`
                  : 'Could not verify token. Please try again.',
              );
            }

            // Close the camera after checking the token.
            try {
              if (scanner.isScanning) {
                await scanner.stop();
              }
              scanner.clear();
            } catch (error) {
              console.error('Could not stop scanner after scan:', error);
            }

            scannerRef.current = null;
            setScanning(false);
            setScannerOpen(false);
          },
          () => {
            // Ignore frames where no QR code is detected.
          },
        );
      } catch (error) {
        console.error('QR scanner error:', error);

        scannerRef.current = null;
        setScanning(false);
        setScanMessage(
          'Could not open the camera. Allow camera access and try again.',
        );

        try {
          scanner.clear();
        } catch {
          // Scanner may not have initialized.
        }
      }
    }, 200);
  }

  async function logout() {
    await stopQrScanner();

    const { error } = await supabase.auth.signOut();

    if (error) setLoginMessage(`Sign-out error: ${error.message}`);

    setLoggedIn(false);
    setSelectedRole(null);
    setAssignedShopCode(null);
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

  async function saveStock(shopCode: string, itemName: string) {
    const key = `${shopCode}-${itemName}`;
    const value = stockDrafts[key];

    if (value === undefined || value.trim() === '') {
      setStockSaveMessage('Please enter a quantity.');
      return;
    }

    const quantity = Number(value);

    if (!Number.isSafeInteger(quantity) || quantity < 0) {
      setStockSaveMessage(
        'Enter a whole number greater than or equal to zero.',
      );
      return;
    }

    setSavingStockKey(key);
    setStockSaveMessage('');

    try {
      const { data: userResult, error: userError } =
        await supabase.auth.getUser();

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
        .update({
          quantity_kg: quantity,
          updated_at: new Date().toISOString(),
        })
        .eq('shop_id', dbShop.id)
        .eq('item_name', itemName)
        .select('id');

      if (updateError) throw updateError;

      if (!updatedRows || updatedRows.length === 0) {
        throw new Error(
          'No stock row was updated. Check database permissions and the item name.',
        );
      }

      await loadStock();

      setStockDrafts((current) => {
        const next = { ...current };
        delete next[key];
        return next;
      });

      setStockSaveMessage(`${itemName} stock saved to Supabase successfully.`);
    } catch (error) {
      console.error('Save stock failed:', error);

      setStockSaveMessage(
        error instanceof Error
          ? `Could not save stock: ${error.message}`
          : 'Could not save stock. Please try again.',
      );
    } finally {
      setSavingStockKey(null);
    }
  }

  // Book the token through Supabase instead of generating a local random token.
  async function bookToken() {
    if (!bookingDate || bookingDate < today) {
      setBookingMessage('Please choose today or a future date.');
      return;
    }

    const shop = shops.find((item) => item.id === bookingShop);

    if (!shop) {
      setBookingMessage('Please select a valid shop.');
      return;
    }

    setBookingMessage('Booking your token...');

    try {
      const { data, error } = await supabase.rpc('book_ration_token', {
        p_shop_code: bookingShop,
        p_token_date: bookingDate,
        p_time_slot: bookingSlot,
      });

      if (error) throw new Error(error.message);

      if (!data?.success) {
        throw new Error(data?.message ?? 'Token booking failed.');
      }

      const token: Token = {
        number: data.token_code,
        shopName: data.shop_name,
        date: data.token_date,
        slot: data.time_slot,
      };

      setActiveToken(token);
      localStorage.setItem('ration-active-token', JSON.stringify(token));
      setBookingMessage('Token booked successfully!');
      setShowBooking(false);
    } catch (error) {
      console.error('Token booking failed:', error);

      setBookingMessage(
        error instanceof Error
          ? `Booking failed: ${error.message}`
          : 'Booking failed. Please try again.',
      );
    }
  }

  function notifyWhenAvailable(shop: Shop) {
    const unavailable = shop.stock.filter((item) => item.quantity === 0);

    const messages = unavailable.map(
      (item) => `Notification requested for ${item.name} at ${shop.name}.`,
    );

    setNotifications((current) => [
      ...current,
      ...messages.filter((message) => !current.includes(message)),
    ]);
  }

  const filteredShops = shops.filter((shop) => {
    const text = search.toLowerCase();

    return (
      shop.name.toLowerCase().includes(text) ||
      shop.village.toLowerCase().includes(text)
    );
  });

  // DEALER DASHBOARD
  if (loggedIn && selectedRole === 'dealer') {
    const dealerShops = shops.filter(
      (shop) => shop.id === assignedShopCode,
    );

    return (
      <main style={pageStyle}>
        <header
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 12,
            flexWrap: 'wrap',
          }}
        >
          <div>
            <h1>RATION DEALER DASHBOARD</h1>
            <p>Welcome, Ration Dealer!</p>
            <p>Manage your assigned shop stock and monitor ration distribution.</p>
            <p style={{ color: '#64748b', fontSize: 13 }}>{stockMessage}</p>
          </div>
          <button style={buttonStyle} onClick={() => void logout()}>
            Log out
          </button>
        </header>

        <section style={{ ...cardStyle, marginTop: 24 }}>
          <h2>Verify Consumer QR Token</h2>
          <p>Scan the QR code presented by a consumer.</p>

          {!scannerOpen ? (
            <button
              type="button"
              style={buttonStyle}
              onClick={() => void startQrScanner()}
            >
              Scan QR Code
            </button>
          ) : (
            <>
              <div
                id="dealer-qr-reader"
                style={{ width: '100%', maxWidth: 400 }}
              />

              {scanning && (
                <p>Camera is active. Point it at the consumer's QR code.</p>
              )}

              <button
                type="button"
                style={{
                  ...buttonStyle,
                  background: '#64748b',
                  marginTop: 12,
                }}
                onClick={() => void stopQrScanner()}
              >
                Close Scanner
              </button>
            </>
          )}

          {scannedToken && (
            <div style={{ marginTop: 16 }}>
              <p>
                <strong>Scanned value:</strong> {scannedToken}
              </p>
            </div>
          )}

          {scanMessage && (
            <p role="status" style={{ marginTop: 12 }}>
              {scanMessage}
            </p>
          )}
        </section>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(270px, 1fr))',
            gap: 20,
            marginTop: 24,
          }}
        >
          {dealerShops.length === 0 ? (
            <section style={cardStyle}>
              <h2>No assigned shop found</h2>
              <p>
                Your account does not have a matching shop assignment.
                Contact the administrator.
              </p>
            </section>
          ) : (
            dealerShops.map((shop) => (
              <section key={shop.id} style={cardStyle}>
                <h2>{shop.name}</h2>
                <p>
                  {shop.village} · {shop.id}
                </p>
                <h3>Available stock</h3>

                {shop.stock.map((item) => {
                  const status = getStockStatus(item.quantity);
                  const key = `${shop.id}-${item.name}`;

                  return (
                    <div
                      key={item.name}
                      style={{
                        padding: '12px 0',
                        borderTop: '1px solid #e2e8f0',
                      }}
                    >
                      <label htmlFor={`stock-${key}`}>{item.name}</label>

                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          marginTop: 8,
                          flexWrap: 'wrap',
                        }}
                      >
                        <input
                          id={`stock-${key}`}
                          aria-label={`${shop.name} ${item.name} quantity`}
                          type="number"
                          min="0"
                          step="1"
                          value={stockDrafts[key] ?? String(item.quantity)}
                          onChange={(event) =>
                            updateStock(
                              shop.id,
                              item.name,
                              event.target.value,
                            )
                          }
                          style={{
                            ...inputStyle,
                            width: 110,
                            margin: 0,
                          }}
                        />
                        <span>kg</span>
                        <button
                          type="button"
                          disabled={savingStockKey === key}
                          style={{
                            ...buttonStyle,
                            padding: '9px 12px',
                            opacity: savingStockKey === key ? 0.7 : 1,
                          }}
                          onClick={() =>
                            void saveStock(shop.id, item.name)
                          }
                        >
                          {savingStockKey === key ? 'Saving...' : 'Save Stock'}
                        </button>
                      </div>

                      <p
                        style={{
                          color:
                            status === 'In stock'
                              ? '#15803d'
                              : status === 'Low stock'
                                ? '#b45309'
                                : '#b91c1c',
                          marginBottom: 0,
                        }}
                      >
                        {status}
                      </p>
                    </div>
                  );
                })}
              </section>
            ))
          )}
        </div>

        {stockSaveMessage && (
          <p
            role="status"
            style={{
              color: stockSaveMessage.includes(
                'saved to Supabase successfully',
              )
                ? '#176b45'
                : '#b91c1c',
              fontSize: 14,
              marginTop: 20,
            }}
          >
            {stockSaveMessage}
          </p>
        )}

        <p style={{ color: '#64748b', fontSize: 13, marginTop: 24 }}>
          Stock is stored in Supabase. Only the shop assigned to your
          authenticated dealer profile can be edited.
        </p>
      </main>
    );
  }

  // GOVERNMENT OFFICIAL DASHBOARD
  if (loggedIn && selectedRole === 'official') {
    const totalStock = shops.reduce(
      (total, shop) =>
        total + shop.stock.reduce((sum, item) => sum + item.quantity, 0),
      0,
    );

    const lowStockItems = shops.reduce(
      (total, shop) =>
        total +
        shop.stock.filter(
          (item) => item.quantity > 0 && item.quantity < 20,
        ).length,
      0,
    );

    const outOfStockItems = shops.reduce(
      (total, shop) =>
        total + shop.stock.filter((item) => item.quantity === 0).length,
      0,
    );

    return (
      <main style={pageStyle}>
        <header
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 12,
            flexWrap: 'wrap',
          }}
        >
          <div>
            <h1>GOVERNMENT OFFICIAL DASHBOARD</h1>
            <p>Overview of stock across all demo ration shops.</p>
            <p style={{ color: '#64748b', fontSize: 13 }}>{stockMessage}</p>
          </div>
          <button style={buttonStyle} onClick={() => void logout()}>
            Log out
          </button>
        </header>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: 16,
            marginTop: 20,
          }}
        >
          <section style={cardStyle}>
            <h3>Total shops</h3>
            <h2>{shops.length}</h2>
          </section>
          <section style={cardStyle}>
            <h3>Total stock</h3>
            <h2>{totalStock} kg</h2>
          </section>
          <section style={cardStyle}>
            <h3>Low-stock items</h3>
            <h2>{lowStockItems}</h2>
          </section>
          <section style={cardStyle}>
            <h3>Out-of-stock items</h3>
            <h2>{outOfStockItems}</h2>
          </section>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(270px, 1fr))',
            gap: 20,
            marginTop: 24,
          }}
        >
          {shops.map((shop) => (
            <section key={shop.id} style={cardStyle}>
              <h2>{shop.name}</h2>
              <p>{shop.village}</p>
              <ul>
                {shop.stock.map((item) => (
                  <li key={item.name}>
                    {item.name}: {item.quantity} kg —{' '}
                    {getStockStatus(item.quantity)}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        <p style={{ color: '#64748b', fontSize: 13, marginTop: 24 }}>
          Demo data only. Not an official government service.
        </p>
      </main>
    );
  }

  // CONSUMER DASHBOARD
  if (loggedIn && selectedRole === 'consumer') {
    return (
      <main style={pageStyle}>
        <header
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 12,
            flexWrap: 'wrap',
          }}
        >
          <div>
            <h1>Consumer Dashboard</h1>
            <p>Find ration shops, check stock, and book a token.</p>
            <p style={{ color: '#64748b', fontSize: 13 }}>{stockMessage}</p>
          </div>
          <button style={buttonStyle} onClick={() => void logout()}>
            Log out
          </button>
        </header>

        {activeToken && (
          <section
            style={{
              ...cardStyle,
              marginTop: 20,
              background: '#f0fdf4',
            }}
          >
            <h2>Your active token</h2>

            <h1 style={{ color: '#166534' }}>{activeToken.number}</h1>

            <p>
              <strong>Shop:</strong> {activeToken.shopName}
            </p>
            <p>
              <strong>Date:</strong> {activeToken.date}
            </p>
            <p>
              <strong>Time slot:</strong> {activeToken.slot}
            </p>

            <div
              style={{
                marginTop: 20,
                padding: 20,
                background: '#ffffff',
                borderRadius: 12,
                textAlign: 'center',
              }}
            >
              <h3>Your ration token QR code</h3>

              <QRCodeSVG
                value={activeToken.number}
                size={200}
                level="M"
                title={`QR code for token ${activeToken.number}`}
              />

              <p style={{ fontSize: 13, color: '#64748b' }}>
                Show this QR code to the dealer for verification.
              </p>
            </div>
          </section>
        )}

        <section style={{ ...cardStyle, marginTop: 20 }}>
          <h2>Find a ration shop</h2>
          <input
            style={inputStyle}
            placeholder="Search by shop name or village..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </section>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(270px, 1fr))',
            gap: 20,
            marginTop: 20,
          }}
        >
          {filteredShops.map((shop) => (
            <section key={shop.id} style={cardStyle}>
              <h2>{shop.name}</h2>
              <p>
                {shop.village} · {shop.distance}
              </p>
              <p>
                <strong>Opening hours:</strong> {shop.hours}
              </p>
              <p>
                <strong>Crowd level:</strong> {shop.crowd}
              </p>
              <h3>Available stock</h3>

              {shop.stock.map((item) => (
                <div
                  key={item.name}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: 8,
                    padding: '8px 0',
                    borderTop: '1px solid #e2e8f0',
                  }}
                >
                  <span>{item.name}</span>
                  <span style={{ textAlign: 'right' }}>
                    <strong>{item.quantity} kg</strong>
                    <br />
                    <small>{getStockStatus(item.quantity)}</small>
                  </span>
                </div>
              ))}

              <button
                style={{ ...buttonStyle, width: '100%', marginTop: 12 }}
                onClick={() => {
                  setBookingShop(shop.id);
                  setBookingDate('');
                  setBookingMessage('');
                  setShowBooking(true);
                }}
              >
                Book a token
              </button>

              {shop.stock.some((item) => item.quantity === 0) && (
                <button
                  style={{
                    ...buttonStyle,
                    width: '100%',
                    marginTop: 8,
                    background: '#475569',
                  }}
                  onClick={() => notifyWhenAvailable(shop)}
                >
                  Notify me when stock is available
                </button>
              )}
            </section>
          ))}
        </div>

        {showBooking && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(15,23,42,0.55)',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              padding: 16,
              zIndex: 1000,
            }}
          >
            <section style={{ ...cardStyle, width: '100%', maxWidth: 430 }}>
              <h2>Book a ration token</h2>

              <label htmlFor="booking-shop">Select shop</label>
              <select
                id="booking-shop"
                style={inputStyle}
                value={bookingShop}
                onChange={(event) => setBookingShop(event.target.value)}
              >
                {shops.map((shop) => (
                  <option key={shop.id} value={shop.id}>
                    {shop.name} — {shop.village}
                  </option>
                ))}
              </select>

              <label htmlFor="booking-date">Select date</label>
              <input
                id="booking-date"
                type="date"
                min={today}
                style={inputStyle}
                value={bookingDate}
                onChange={(event) => setBookingDate(event.target.value)}
              />

              <label htmlFor="booking-slot">Select time slot</label>
              <select
                id="booking-slot"
                style={inputStyle}
                value={bookingSlot}
                onChange={(event) => setBookingSlot(event.target.value)}
              >
                <option>9:00 AM – 11:00 AM</option>
                <option>11:00 AM – 1:00 PM</option>
                <option>1:00 PM – 3:00 PM</option>
                <option>3:00 PM – 5:00 PM</option>
              </select>

              {bookingMessage && (
                <p
                  role="status"
                  style={{
                    color: bookingMessage.includes('successfully')
                      ? '#176b45'
                      : '#b91c1c',
                  }}
                >
                  {bookingMessage}
                </p>
              )}

              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  type="button"
                  disabled={bookingMessage === 'Booking your token...'}
                  style={{
                    ...buttonStyle,
                    flex: 1,
                    opacity:
                      bookingMessage === 'Booking your token...' ? 0.7 : 1,
                  }}
                  onClick={() => void bookToken()}
                >
                  {bookingMessage === 'Booking your token...'
                    ? 'Booking...'
                    : 'Confirm booking'}
                </button>
                <button
                  type="button"
                  style={{
                    ...buttonStyle,
                    flex: 1,
                    background: '#64748b',
                  }}
                  onClick={() => {
                    setShowBooking(false);
                    setBookingMessage('');
                  }}
                >
                  Cancel
                </button>
              </div>
            </section>
          </div>
        )}

        <section style={{ ...cardStyle, marginTop: 20 }}>
          <h2>Notifications</h2>
          {notifications.length === 0 ? (
            <p>No notifications yet.</p>
          ) : (
            <ul>
              {notifications.map((message, index) => (
                <li key={`${message}-${index}`}>{message}</li>
              ))}
            </ul>
          )}
        </section>

        <p style={{ color: '#64748b', fontSize: 13, marginTop: 24 }}>
          Demo data only. Not an official government service.
        </p>
      </main>
    );
  }

  // HOMEPAGE AND LOGIN
  return (
    <main style={pageStyle}>
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        <h2 style={{ color: '#176b45' }}>Smart Ration Queue</h2>

        <select
          aria-label="Select language"
          value={language}
          onChange={(event) =>
            setLanguage(event.target.value as 'English' | 'தமிழ்')
          }
          style={{ ...inputStyle, width: 130, margin: 0 }}
        >
          <option value="English">English</option>
          <option value="தமிழ்">தமிழ்</option>
        </select>
      </header>

      <section style={{ padding: '50px 0 35px', textAlign: 'center' }}>
        <h1 style={{ fontSize: 'clamp(30px, 5vw, 48px)' }}>
          {language === 'தமிழ்'
            ? 'ஸ்மார்ட் ரேஷன் வரிசை'
            : 'Smart Ration Queue and Stock Management'}
        </h1>

        <p style={{ color: '#64748b', fontSize: 18 }}>
          {language === 'தமிழ்'
            ? 'வரிசையில் காத்திருக்கும் நேரத்தைக் குறைத்து, இருப்பை அறியுங்கள்.'
            : 'Check ration stock, reduce waiting time, and plan your visit.'}
        </p>
      </section>

      {!selectedRole ? (
        <section>
          <h2 style={{ textAlign: 'center' }}>Choose your role</h2>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: 20,
              marginTop: 24,
            }}
          >
            {(
              [
                {
                  role: 'consumer',
                  title: 'Consumer',
                  description: 'Check stock and book a ration token.',
                },
                {
                  role: 'dealer',
                  title: 'Ration Dealer',
                  description: 'Manage shop stock and availability.',
                },
                {
                  role: 'official',
                  title: 'Government Official',
                  description: 'Monitor stock across demo shops.',
                },
              ] as const
            ).map((item) => (
              <button
                key={item.role}
                onClick={() => {
                  setSelectedRole(item.role);
                  setLoginMessage('');
                }}
                style={{
                  ...cardStyle,
                  textAlign: 'left',
                  cursor: 'pointer',
                  color: '#0f172a',
                }}
              >
                <h2>{item.title}</h2>
                <p>{item.description}</p>
                <strong style={{ color: '#176b45' }}>Continue →</strong>
              </button>
            ))}
          </div>
        </section>
      ) : (
        <section style={{ ...cardStyle, maxWidth: 440, margin: '0 auto' }}>
          <h2>
            {selectedRole === 'consumer'
              ? 'Consumer Login'
              : selectedRole === 'dealer'
                ? 'Ration Dealer Login'
                : 'Government Official Login'}
          </h2>

          <p style={{ color: '#64748b' }}>
            Sign in with your registered Supabase email and password.
          </p>

          <form
            onSubmit={(event) => {
              event.preventDefault();
              void loginWithPassword();
            }}
          >
            <label htmlFor="login-email">Email address</label>
            <input
              id="login-email"
              type="email"
              autoComplete="username"
              required
              style={inputStyle}
              placeholder="Enter your email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />

            <label htmlFor="login-password">Password</label>
            <input
              id="login-password"
              type="password"
              autoComplete="current-password"
              required
              style={inputStyle}
              placeholder="Enter your password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />

            <button
              type="submit"
              disabled={loginMessage === 'Signing in...'}
              style={{
                ...buttonStyle,
                width: '100%',
                opacity: loginMessage === 'Signing in...' ? 0.7 : 1,
              }}
            >
              {loginMessage === 'Signing in...' ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          {loginMessage && (
            <p role="status" style={{ color: '#b91c1c', marginTop: 12 }}>
              {loginMessage}
            </p>
          )}

          <button
            type="button"
            style={{
              ...buttonStyle,
              background: '#64748b',
              width: '100%',
              marginTop: 12,
            }}
            onClick={() => {
              setSelectedRole(null);
              setPassword('');
              setLoginMessage('');
            }}
          >
            Back
          </button>

          <p style={{ color: '#64748b', fontSize: 12, marginTop: 16 }}>
            Use a registered Supabase account. Access depends on the role
            assigned to that account in the database.
          </p>
        </section>
      )}

      <footer
        style={{
          textAlign: 'center',
          marginTop: 48,
          padding: '20px 0',
          color: '#64748b',
          borderTop: '1px solid #e2e8f0',
          fontSize: 13,
        }}
      >
        Demo data only. Not an official government service.
      </footer>
    </main>
  );
}

export default App;
