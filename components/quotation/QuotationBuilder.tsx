import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import {
  ActivityIndicator,
  Button,
  Card,
  Chip,
  Divider,
  HelperText,
  Icon,
  IconButton,
  Modal,
  Portal,
  SegmentedButtons,
  Text,
  TextInput,
  useTheme,
} from 'react-native-paper';

import { ProductThumb } from '@/components/ui/ProductThumb';
import { CalendarField } from '@/components/ui/CalendarField';
import { DropdownField } from '@/components/ui/DropdownField';
import { VoiceInputButton } from '@/components/ui/VoiceInputButton';
import { useAuth } from '@/contexts/auth-context';
import { useMyanmarSpeechToText } from '@/hooks/use-myanmar-speech-to-text';
import { useResponsive } from '@/hooks/use-responsive';
import { searchContactsByPhone } from '@/services/customers';
import { Customer, ContactSearchResult } from '@/types/customer';
import { Product } from '@/types/product';
import { PaymentMethod } from '@/types/quotation';
import { validateMyanmarPhone } from '@/utils/myanmar-phone';

export type OrderLine = {
  product: Product;
  qty: number;
  unitPrice: number;
  discountPercent: number;
};

export type QuotationDraft = {
  customer: Customer;
  phoneNumber: string;
  deliveryNote: string;
  preferredDeliveryDate: string;
  paymentMethodLineId?: string;
  lines: OrderLine[];
  total: number;
};

function formatMoney(value: number): string {
  const safe = Number.isFinite(value) ? value : 0;
  return `${safe.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} MMK`;
}

function lineAmount(line: OrderLine): number {
  const base = line.qty * line.unitPrice;
  const discount = Math.min(Math.max(line.discountPercent, 0), 100);
  return base * (1 - discount / 100);
}

function OrderLineRow({
  line,
  onQtyChange,
  onUnitPriceChange,
  onDiscountChange,
  onRemove,
}: {
  line: OrderLine;
  onQtyChange: (productId: string, qty: number) => void;
  onUnitPriceChange: (productId: string, unitPrice: number) => void;
  onDiscountChange: (productId: string, discountPercent: number) => void;
  onRemove: (productId: string) => void;
}) {
  const theme = useTheme();
  const outline = theme.colors.outlineVariant ?? theme.colors.outline;
  const [qtyText, setQtyText] = useState(String(line.qty));
  const [priceText, setPriceText] = useState(String(line.unitPrice));
  const [discText, setDiscText] = useState(String(line.discountPercent));

  useEffect(() => {
    setQtyText(String(line.qty));
  }, [line.qty]);

  useEffect(() => {
    setPriceText(String(line.unitPrice));
  }, [line.unitPrice]);

  useEffect(() => {
    setDiscText(String(line.discountPercent));
  }, [line.discountPercent]);

  const commitQty = () => {
    const parsed = parseFloat(qtyText.replace(/,/g, ''));
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setQtyText(String(line.qty));
      return;
    }
    onQtyChange(line.product.id, parsed);
  };

  const commitPrice = () => {
    const parsed = parseFloat(priceText.replace(/,/g, ''));
    if (!Number.isFinite(parsed) || parsed < 0) {
      setPriceText(String(line.unitPrice));
      return;
    }
    onUnitPriceChange(line.product.id, parsed);
  };

  const commitDisc = () => {
    const parsed = parseFloat(discText.replace(/,/g, ''));
    if (!Number.isFinite(parsed) || parsed < 0) {
      setDiscText(String(line.discountPercent));
      return;
    }
    onDiscountChange(line.product.id, Math.min(parsed, 100));
  };

  const stepQty = (delta: number) => {
    const next = line.qty + delta;
    if (next <= 0) {
      onRemove(line.product.id);
      return;
    }
    onQtyChange(line.product.id, next);
  };

  return (
    <View style={[styles.orderLineRow, { borderBottomColor: outline }]}>
      <View style={styles.orderProductCell}>
        <ProductThumb uri={line.product.image} size={40} />
        <View style={styles.flex1}>
          <Text numberOfLines={2} style={styles.orderProductName}>
            {line.product.name}
          </Text>
          <Text
            variant="labelSmall"
            numberOfLines={1}
            style={{ color: theme.colors.onSurfaceVariant }}>
            {line.product.unit || 'Units'}
          </Text>
        </View>
      </View>

      <View style={styles.qtyStepper}>
        <IconButton
          icon="minus"
          size={16}
          mode="outlined"
          style={styles.stepperBtn}
          onPress={() => stepQty(-1)}
        />
        <TextInput
          mode="outlined"
          dense
          value={qtyText}
          onChangeText={setQtyText}
          onBlur={commitQty}
          onSubmitEditing={commitQty}
          keyboardType="decimal-pad"
          style={styles.qtyStepperInput}
          contentStyle={styles.orderInputContent}
        />
        <IconButton
          icon="plus"
          size={16}
          mode="outlined"
          style={styles.stepperBtn}
          onPress={() => stepQty(1)}
        />
      </View>

      <TextInput
        mode="outlined"
        dense
        value={priceText}
        onChangeText={setPriceText}
        onBlur={commitPrice}
        onSubmitEditing={commitPrice}
        keyboardType="decimal-pad"
        style={styles.orderPriceInput}
        contentStyle={styles.orderInputContent}
      />

      <TextInput
        mode="outlined"
        dense
        value={discText}
        onChangeText={setDiscText}
        onBlur={commitDisc}
        onSubmitEditing={commitDisc}
        keyboardType="decimal-pad"
        style={styles.orderDiscInput}
        contentStyle={styles.orderInputContent}
        right={<TextInput.Affix text="%" />}
      />

      <Text style={styles.orderAmountCell} numberOfLines={1}>
        {formatMoney(lineAmount(line))}
      </Text>

      <IconButton
        icon="trash-can-outline"
        size={18}
        iconColor={theme.colors.error}
        style={styles.orderDeleteBtn}
        onPress={() => onRemove(line.product.id)}
      />
    </View>
  );
}

function customerAddress(customer: Customer): string {
  return [customer.township, customer.city].filter(Boolean).join(', ');
}

type QuotationBuilderProps = {
  customers: Customer[];
  products: Product[];
  paymentMethods: PaymentMethod[];
  loading: boolean;
  error: string;
  onDiscard: () => void;
  onSave: (draft: QuotationDraft) => void;
  saving?: boolean;
  initialCustomerId?: string | null;
};

export function QuotationBuilder({
  customers,
  products,
  paymentMethods,
  loading,
  error,
  onDiscard,
  onSave,
  saving = false,
  initialCustomerId = null,
}: QuotationBuilderProps) {
  const theme = useTheme();
  const { session } = useAuth();
  const { isDesktop } = useResponsive();

  const [tab, setTab] = useState<'contact' | 'products'>('contact');
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [phone, setPhone] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [phoneMatches, setPhoneMatches] = useState<ContactSearchResult[]>([]);
  const [checkingPhone, setCheckingPhone] = useState(false);
  const [customerPickerOpen, setCustomerPickerOpen] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');
  const [deliveryNote, setDeliveryNote] = useState('');
  const [preferredDeliveryDate, setPreferredDeliveryDate] = useState('');
  const [paymentMethodLineId, setPaymentMethodLineId] = useState('');
  const [contactError, setContactError] = useState('');
  const [speechError, setSpeechError] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [productView, setProductView] = useState<'list' | 'card'>('list');
  const [category, setCategory] = useState('');
  const [lines, setLines] = useState<OrderLine[]>([]);

  const handleVoiceTranscript = useCallback((text: string, isFinal: boolean) => {
    if (!text) {
      return;
    }

    setSpeechError('');
    setContactError('');

    if (isFinal) {
      setDeliveryNote(previous =>
        previous.trim() ? `${previous.trim()} ${text}` : text,
      );
      setInterimTranscript('');
      return;
    }

    setInterimTranscript(text);
  }, []);

  const {
    isListening,
    isSupported: isVoiceSupported,
    toggle: toggleVoiceInput,
    stop: stopVoiceInput,
  } = useMyanmarSpeechToText({
    onTranscript: handleVoiceTranscript,
    onError: setSpeechError,
  });

  useEffect(() => {
    return () => {
      stopVoiceInput();
    };
  }, [stopVoiceInput]);

  const selectCustomer = (next: Customer | null) => {
    setCustomer(next);
    if (next?.phone) {
      setPhone(next.phone);
    }
    setPhoneMatches([]);
    setPhoneError('');
  };

  const lookupPhoneMatches = async (normalizedPhone: string) => {
    if (!session?.token) {
      return [];
    }
    const results = await searchContactsByPhone(session.token, normalizedPhone);
    setPhoneMatches(results);
    return results;
  };

  const applyPhoneMatch = (match: ContactSearchResult) => {
    const existing = customers.find(item => item.id === match.id);
    if (existing) {
      selectCustomer(existing);
      return;
    }

    selectCustomer({
      id: match.id,
      name: match.name,
      email: '',
      phone: match.phone,
      city: match.city,
      jobPosition: '',
      company: '',
      isCompany: false,
      activity: '',
      township: match.township,
      status: '',
      lastMonthSales: 0,
      thisMonthSales: 0,
      thisMonthPercent: 0,
      lastInvoiceDate: '',
      expoPushToken: '',
      extra: {},
    });
  };

  const handlePhoneChange = (value: string) => {
    setPhone(value);
    setPhoneMatches([]);
    setPhoneError('');
  };

  const handlePhoneBlur = async () => {
    if (!phone.trim()) {
      setPhoneError('');
      setPhoneMatches([]);
      return;
    }

    let normalized = '';
    try {
      normalized = validateMyanmarPhone(phone, 'ဖုန်းနံပါတ်');
      setPhone(normalized);
      setPhoneError('');
    } catch (error) {
      setPhoneError(error instanceof Error ? error.message : 'Invalid phone number.');
      setPhoneMatches([]);
      return;
    }

    if (!session?.token) {
      return;
    }

    setCheckingPhone(true);
    try {
      const results = await lookupPhoneMatches(normalized);
      if (results.length === 1) {
        applyPhoneMatch(results[0]);
      }
    } catch {
      // Manual check remains available.
    } finally {
      setCheckingPhone(false);
    }
  };

  const handleCheckPhone = async () => {
    if (!session?.token) {
      return;
    }

    setPhoneError('');
    setPhoneMatches([]);

    let normalized = '';
    try {
      normalized = validateMyanmarPhone(phone, 'ဖုန်းနံပါတ်');
      setPhone(normalized);
      setPhoneError('');
    } catch (error) {
      setPhoneError(error instanceof Error ? error.message : 'Invalid phone number.');
      return;
    }

    setCheckingPhone(true);
    try {
      const results = await lookupPhoneMatches(normalized);
      if (results.length === 1) {
        applyPhoneMatch(results[0]);
      }
    } catch (error) {
      setPhoneError(
        error instanceof Error ? error.message : 'Failed to search contacts.',
      );
    } finally {
      setCheckingPhone(false);
    }
  };

  useEffect(() => {
    if (!initialCustomerId) {
      return;
    }
    const match = customers.find(item => item.id === initialCustomerId);
    if (match) {
      selectCustomer(match);
      setTab('contact');
    }
  }, [initialCustomerId, customers]);

  const filteredCustomers = useMemo(() => {
    const term = customerSearch.trim().toLowerCase();
    if (!term) {
      return customers;
    }
    return customers.filter(
      item =>
        item.name.toLowerCase().includes(term) ||
        item.phone.toLowerCase().includes(term) ||
        item.township.toLowerCase().includes(term),
    );
  }, [customers, customerSearch]);

  const categories = useMemo(() => {
    const unique = new Set<string>();
    products.forEach(item => {
      if (item.category) {
        unique.add(item.category);
      }
    });
    return Array.from(unique).sort((a, b) => a.localeCompare(b));
  }, [products]);

  const filteredProducts = useMemo(() => {
    const term = productSearch.trim().toLowerCase();
    return products.filter(item => {
      const matchesCategory = !category || item.category === category;
      const matchesTerm =
        !term ||
        item.name.toLowerCase().includes(term) ||
        item.sku.toLowerCase().includes(term);
      return matchesCategory && matchesTerm;
    });
  }, [products, productSearch, category]);

  const total = useMemo(
    () => lines.reduce((sum, line) => sum + lineAmount(line), 0),
    [lines],
  );

  const addProduct = (product: Product) => {
    setLines(prev => {
      const existing = prev.find(line => line.product.id === product.id);
      if (existing) {
        return prev.map(line =>
          line.product.id === product.id
            ? { ...line, qty: line.qty + 1 }
            : line,
        );
      }
      return [
        ...prev,
        { product, qty: 1, unitPrice: product.price, discountPercent: 0 },
      ];
    });
  };

  const setQty = (productId: string, qty: number) => {
    setLines(prev =>
      prev
        .map(line =>
          line.product.id === productId ? { ...line, qty } : line,
        )
        .filter(line => line.qty > 0),
    );
  };

  const setDiscount = (productId: string, discountPercent: number) => {
    setLines(prev =>
      prev.map(line =>
        line.product.id === productId ? { ...line, discountPercent } : line,
      ),
    );
  };

  const setUnitPrice = (productId: string, unitPrice: number) => {
    setLines(prev =>
      prev.map(line =>
        line.product.id === productId ? { ...line, unitPrice } : line,
      ),
    );
  };

  const removeLine = (productId: string) => {
    setLines(prev => prev.filter(line => line.product.id !== productId));
  };

  const handleSave = () => {
    setContactError('');

    if (!customer) {
      setContactError('Please select a customer.');
      setTab('contact');
      return;
    }
    if (lines.length === 0) {
      setContactError('Add at least one product before saving.');
      setTab('products');
      return;
    }

    let normalizedPhone = phone.trim();
    try {
      normalizedPhone = validateMyanmarPhone(phone, 'ဖုန်းနံပါတ်');
      setPhone(normalizedPhone);
      setPhoneError('');
    } catch (error) {
      setPhoneError(error instanceof Error ? error.message : 'Invalid phone number.');
      setTab('contact');
      return;
    }

    if (!preferredDeliveryDate.trim()) {
      setContactError('Preferred delivery date is required.');
      setTab('contact');
      return;
    }

    if (!deliveryNote.trim()) {
      setContactError('Delivery notes are required.');
      setTab('contact');
      return;
    }

    onSave({
      customer,
      phoneNumber: normalizedPhone,
      deliveryNote,
      preferredDeliveryDate,
      paymentMethodLineId: paymentMethodLineId || undefined,
      lines,
      total,
    });
  };

  const canSave =
    !!customer &&
    lines.length > 0 &&
    !saving &&
    !phoneError &&
    !!phone.trim() &&
    !!preferredDeliveryDate.trim() &&
    !!deliveryNote.trim();

  const lineCount = lines.reduce((sum, line) => sum + line.qty, 0);

  const paymentMethodLabel =
    paymentMethods.find(method => method.id === paymentMethodLineId)?.name ?? '';

  const contactPanel = (
    <View style={styles.panelGap}>
      <View>
        <Text
          variant="labelMedium"
          style={[styles.fieldLabel, { color: theme.colors.onSurfaceVariant }]}>
          Phone Number
        </Text>
        <TextInput
          mode="outlined"
          placeholder="09xxxxxxxxx"
          keyboardType="phone-pad"
          value={phone}
          onChangeText={handlePhoneChange}
          onBlur={handlePhoneBlur}
          error={!!phoneError}
          left={<TextInput.Icon icon="phone-outline" />}
        />
        {phoneError ? <HelperText type="error">{phoneError}</HelperText> : null}
        {customer ? (
          <HelperText type="info">
            Contact selected: {customer.name}
            {customer.phone ? ` · ${customer.phone}` : ''}
          </HelperText>
        ) : null}
        {checkingPhone ? (
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
            Checking phone number...
          </Text>
        ) : null}
        <Button
          mode="contained-tonal"
          icon="account-search-outline"
          loading={checkingPhone}
          disabled={checkingPhone || !phone.trim()}
          onPress={handleCheckPhone}
          style={styles.checkPhoneButton}>
          Check / Select Contact
        </Button>
      </View>

      {phoneMatches.length > 0 ? (
        <View style={styles.matchesSection}>
          <Text variant="titleSmall" style={{ fontWeight: '600' }}>
            Existing contacts found
          </Text>
          {phoneMatches.map(match => (
            <Card key={match.id} style={styles.matchCard}>
              <Card.Content>
                <Text variant="titleMedium">{match.name}</Text>
                <Text style={{ color: theme.colors.onSurfaceVariant }}>
                  {match.phone || '—'}
                </Text>
                {[match.township, match.city].filter(Boolean).length ? (
                  <Text style={{ color: theme.colors.onSurfaceVariant }}>
                    {[match.township, match.city].filter(Boolean).join(', ')}
                  </Text>
                ) : null}
                <Button
                  mode="outlined"
                  compact
                  style={styles.useContactButton}
                  onPress={() => applyPhoneMatch(match)}>
                  Use This Contact
                </Button>
              </Card.Content>
            </Card>
          ))}
        </View>
      ) : null}

      <View>
        <Text
          variant="labelMedium"
          style={[styles.fieldLabel, { color: theme.colors.onSurfaceVariant }]}>
          Customer
        </Text>
        <Pressable
          onPress={() => setCustomerPickerOpen(true)}
          style={[
            styles.selectField,
            {
              borderColor: theme.colors.outline,
              backgroundColor: theme.colors.surface,
            },
          ]}>
          <Icon
            source="account-outline"
            size={20}
            color={theme.colors.onSurfaceVariant}
          />
          <Text
            style={{
              flex: 1,
              color: customer
                ? theme.colors.onSurface
                : theme.colors.onSurfaceVariant,
            }}
            numberOfLines={1}>
            {customer ? customer.name : 'Select a customer'}
          </Text>
          <Icon
            source="chevron-down"
            size={22}
            color={theme.colors.onSurfaceVariant}
          />
        </Pressable>
      </View>

      {customer ? (
        <View
          style={[
            styles.infoCard,
            {
              backgroundColor: theme.colors.surfaceVariant,
              borderColor: theme.colors.outlineVariant ?? theme.colors.outline,
            },
          ]}>
          <View style={styles.infoRow}>
            <Icon source="map-marker-outline" size={18} color={theme.colors.primary} />
            <Text style={styles.infoText}>
              {customerAddress(customer) || 'No address on file'}
            </Text>
          </View>
        </View>
      ) : null}

      <View>
        <DropdownField
          label="Payment Method"
          placeholder="Select payment method"
          value={paymentMethodLabel}
          options={paymentMethods.map(method => method.name)}
          onChange={label => {
            const match = paymentMethods.find(method => method.name === label);
            setPaymentMethodLineId(match?.id ?? '');
          }}
          sortOptions={false}
        />
        {paymentMethods.length === 0 ? (
          <HelperText type="info">
            Payment methods could not be loaded. Restart the backend with the latest
            update, then open New Quotation again.
          </HelperText>
        ) : null}
      </View>

      <View>
        <CalendarField
          label="Preferred Delivery Date *"
          value={preferredDeliveryDate}
          onChange={value => {
            setPreferredDeliveryDate(value);
            setContactError('');
          }}
          placeholder="Select preferred delivery date"
        />
      </View>

      <View>
        <View style={styles.fieldLabelRow}>
          <Text
            variant="labelMedium"
            style={{ color: theme.colors.onSurfaceVariant }}>
            Delivery Notes *
          </Text>
          <VoiceInputButton
            listening={isListening}
            supported={isVoiceSupported}
            onPress={toggleVoiceInput}
          />
        </View>
        <TextInput
          mode="outlined"
          placeholder="Delivery instructions..."
          value={
            interimTranscript && isListening
              ? deliveryNote.trim()
                ? `${deliveryNote.trim()} ${interimTranscript}`
                : interimTranscript
              : deliveryNote
          }
          onChangeText={value => {
            setDeliveryNote(value);
            setInterimTranscript('');
            setSpeechError('');
            setContactError('');
            if (isListening) {
              stopVoiceInput();
            }
          }}
          multiline
          numberOfLines={3}
          error={!!contactError && !deliveryNote.trim()}
        />
        {isListening ? (
          <HelperText type="info">
            Listening for Myanmar speech… Tap the microphone to stop.
          </HelperText>
        ) : null}
        {speechError ? <HelperText type="error">{speechError}</HelperText> : null}
      </View>

      {contactError ? <HelperText type="error">{contactError}</HelperText> : null}
    </View>
  );

  const outline = theme.colors.outlineVariant ?? theme.colors.outline;

  const renderProductListRow = (product: Product) => {
    const inCart = lines.find(line => line.product.id === product.id);
    return (
      <Pressable
        key={product.id}
        onPress={() => addProduct(product)}
        style={({ hovered, pressed }) => [
          styles.productRow,
          { borderBottomColor: outline },
          hovered && { backgroundColor: theme.colors.primaryContainer },
          pressed && { opacity: 0.85 },
        ]}>
        <ProductThumb uri={product.image} size={48} />
        <View style={styles.flex1}>
          <Text numberOfLines={1} style={{ fontWeight: '600' }}>
            {product.name}
          </Text>
          <Text
            variant="bodySmall"
            style={{ color: theme.colors.onSurfaceVariant }}>
            {product.sku || '—'} · {formatMoney(product.price)} · Stock{' '}
            {product.stock}
          </Text>
        </View>
        {inCart ? (
          <View style={styles.qtyPill}>
            <Text
              variant="labelSmall"
              style={{ color: theme.colors.onPrimary, fontWeight: '700' }}>
              {inCart.qty}
            </Text>
          </View>
        ) : (
          <Icon source="plus-circle" size={24} color={theme.colors.primary} />
        )}
      </Pressable>
    );
  };

  const renderProductCard = (product: Product) => {
    const inCart = lines.find(line => line.product.id === product.id);
    return (
      <Pressable
        key={product.id}
        onPress={() => addProduct(product)}
        style={({ hovered, pressed }) => [
          styles.pickCard,
          {
            backgroundColor: inCart
              ? theme.colors.primaryContainer
              : theme.colors.surface,
            borderColor: inCart ? theme.colors.primary : outline,
          },
          hovered && {
            borderColor: theme.colors.primary,
            backgroundColor: theme.colors.primaryContainer,
            transform: [{ translateY: -3 }],
            shadowColor: '#000',
            shadowOpacity: 0.18,
            shadowRadius: 8,
            shadowOffset: { width: 0, height: 4 },
            elevation: 4,
          },
          pressed && { opacity: 0.9 },
        ]}>
        <ProductThumb uri={product.image} size={72} style={styles.pickCardImage} />
        <View style={styles.pickCardTop}>
          <Text numberOfLines={2} style={styles.pickCardName}>
            {product.name}
          </Text>
          {inCart ? (
            <View style={styles.qtyPill}>
              <Text
                variant="labelSmall"
                style={{ color: theme.colors.onPrimary, fontWeight: '700' }}>
                {inCart.qty}
              </Text>
            </View>
          ) : (
            <Icon source="plus-circle" size={22} color={theme.colors.primary} />
          )}
        </View>
        <Text
          variant="bodySmall"
          numberOfLines={1}
          style={{ color: theme.colors.onSurfaceVariant }}>
          {product.sku || 'No SKU'}
        </Text>
        <View style={styles.pickCardFooter}>
          <Text style={{ color: theme.colors.primary, fontWeight: '800' }}>
            {formatMoney(product.price)}
          </Text>
          <Text
            variant="labelSmall"
            style={{ color: theme.colors.onSurfaceVariant }}>
            Stock {product.stock}
          </Text>
        </View>
      </Pressable>
    );
  };

  const productsPanel = (
    <View style={styles.panelGap}>
      <View style={styles.searchRow}>
        <View style={styles.flex1}>
          <TextInput
            mode="outlined"
            placeholder="Search products by name or SKU"
            value={productSearch}
            onChangeText={setProductSearch}
            left={<TextInput.Icon icon="magnify" />}
            dense
          />
        </View>
        <View style={[styles.viewToggle, { borderColor: outline }]}>
          <IconButton
            icon="format-list-bulleted"
            size={20}
            mode={productView === 'list' ? 'contained' : undefined}
            onPress={() => setProductView('list')}
            style={styles.viewToggleBtn}
          />
          <IconButton
            icon="view-grid-outline"
            size={20}
            mode={productView === 'card' ? 'contained' : undefined}
            onPress={() => setProductView('card')}
            style={styles.viewToggleBtn}
          />
        </View>
      </View>

      {categories.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryRow}>
          <Chip
            mode={category === '' ? 'flat' : 'outlined'}
            selected={category === ''}
            showSelectedCheck={false}
            onPress={() => setCategory('')}
            style={styles.categoryChip}>
            All
          </Chip>
          {categories.map(cat => (
            <Chip
              key={cat}
              mode={category === cat ? 'flat' : 'outlined'}
              selected={category === cat}
              showSelectedCheck={false}
              onPress={() => setCategory(cat)}
              style={styles.categoryChip}>
              {cat}
            </Chip>
          ))}
        </ScrollView>
      ) : null}

      <View style={[styles.productList, { borderColor: outline }]}>
        <ScrollView
          style={styles.productScroll}
          showsVerticalScrollIndicator={false}
          nestedScrollEnabled>
          {filteredProducts.length === 0 ? (
            <Text style={styles.emptyText}>No products found.</Text>
          ) : productView === 'list' ? (
            filteredProducts.map(renderProductListRow)
          ) : (
            <View style={styles.cardGrid}>
              {filteredProducts.map(renderProductCard)}
            </View>
          )}
        </ScrollView>
      </View>
    </View>
  );

  const orderSummary = (
    <View
      style={[
        styles.summaryCard,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.outlineVariant ?? theme.colors.outline,
        },
      ]}>
      <View style={styles.summaryHeader}>
        <Text variant="titleMedium" style={{ fontWeight: '700' }}>
          Order Lines
        </Text>
        <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant }}>
          {lineCount} item{lineCount === 1 ? '' : 's'}
        </Text>
      </View>
      <Divider />

      {lines.length > 0 ? (
        <View
          style={[
            styles.orderTableHeader,
            { borderBottomColor: theme.colors.outlineVariant ?? theme.colors.outline },
          ]}>
          <Text variant="labelSmall" style={[styles.orderHeaderProduct, styles.orderHeaderText]}>
            Product
          </Text>
          <Text variant="labelSmall" style={[styles.orderHeaderQty, styles.orderHeaderText]}>
            Quantity
          </Text>
          <Text variant="labelSmall" style={[styles.orderHeaderPrice, styles.orderHeaderText]}>
            Unit Price
          </Text>
          <Text variant="labelSmall" style={[styles.orderHeaderDisc, styles.orderHeaderText]}>
            Disc.%
          </Text>
          <Text variant="labelSmall" style={[styles.orderHeaderAmount, styles.orderHeaderText]}>
            Amount
          </Text>
          <View style={styles.orderHeaderDelete} />
        </View>
      ) : null}

      <ScrollView
        style={styles.summaryScroll}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled>
        {lines.length === 0 ? (
          <View style={styles.summaryEmpty}>
            <Icon
              source="cart-outline"
              size={40}
              color={theme.colors.onSurfaceVariant}
            />
            <Text
              style={{
                color: theme.colors.onSurfaceVariant,
                textAlign: 'center',
                marginTop: 8,
              }}>
              No products selected yet. Add products from the Products tab.
            </Text>
          </View>
        ) : (
          lines.map(line => (
            <OrderLineRow
              key={line.product.id}
              line={line}
              onQtyChange={setQty}
              onUnitPriceChange={setUnitPrice}
              onDiscountChange={setDiscount}
              onRemove={removeLine}
            />
          ))
        )}
      </ScrollView>

      <Divider />
      <View style={styles.totalRow}>
        <Text variant="titleMedium" style={{ fontWeight: '700' }}>
          Total
        </Text>
        <Text variant="titleLarge" style={{ color: theme.colors.primary, fontWeight: '800' }}>
          {formatMoney(total)}
        </Text>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.surface }]}>
      <View
        style={[
          styles.topBar,
          { borderBottomColor: theme.colors.outlineVariant ?? theme.colors.outline },
        ]}>
        <View style={styles.topBarLeft}>
          <IconButton icon="arrow-left" size={22} onPress={onDiscard} />
          <Text variant="titleMedium" style={{ fontWeight: '700' }}>
            New Quotation
          </Text>
        </View>
        <View style={styles.topBarRight}>
          <Button mode="outlined" onPress={onDiscard} disabled={saving}>
            Discard
          </Button>
          <Button
            mode="contained"
            icon="content-save"
            disabled={!canSave}
            loading={saving}
            onPress={handleSave}>
            Save
          </Button>
        </View>
      </View>

      {error ? (
        <Text style={[styles.errorText, { color: theme.colors.error }]}>
          {error}
        </Text>
      ) : null}

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator />
          <Text style={{ marginTop: 12 }}>Loading data from Odoo...</Text>
        </View>
      ) : (
        <View style={[styles.body, isDesktop ? styles.bodyRow : styles.bodyColumn]}>
          <View style={isDesktop ? styles.leftColumn : styles.leftColumnMobile}>
            <SegmentedButtons
              value={tab}
              onValueChange={value => setTab(value as 'contact' | 'products')}
              buttons={[
                { value: 'contact', label: 'Contact', icon: 'account' },
                {
                  value: 'products',
                  label: `Products${lineCount ? ` (${lineCount})` : ''}`,
                  icon: 'package-variant-closed',
                },
              ]}
              style={styles.tabs}
            />
            <ScrollView
              style={styles.panelScroll}
              contentContainerStyle={styles.panelContent}
              showsVerticalScrollIndicator={false}
              nestedScrollEnabled>
              {tab === 'contact' ? contactPanel : productsPanel}
            </ScrollView>
          </View>

          <View style={isDesktop ? styles.rightColumn : styles.rightColumnMobile}>
            {orderSummary}
          </View>
        </View>
      )}

      <Portal>
        <Modal
          visible={customerPickerOpen}
          onDismiss={() => setCustomerPickerOpen(false)}
          contentContainerStyle={[
            styles.pickerModal,
            { backgroundColor: theme.colors.surface },
          ]}>
          <Text variant="titleMedium" style={styles.pickerTitle}>
            Select Customer
          </Text>
          <TextInput
            mode="outlined"
            placeholder="Search customers"
            value={customerSearch}
            onChangeText={setCustomerSearch}
            left={<TextInput.Icon icon="magnify" />}
            dense
            autoFocus
          />
          <ScrollView
            style={styles.pickerList}
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled>
            {filteredCustomers.length === 0 ? (
              <Text style={styles.emptyText}>No customers found.</Text>
            ) : (
              filteredCustomers.map(item => (
                <Pressable
                  key={item.id}
                  onPress={() => {
                    selectCustomer(item);
                    setCustomerPickerOpen(false);
                    setCustomerSearch('');
                  }}
                  style={[
                    styles.pickerRow,
                    {
                      borderBottomColor:
                        theme.colors.outlineVariant ?? theme.colors.outline,
                    },
                  ]}>
                  <Text style={{ fontWeight: '600' }} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text
                    variant="bodySmall"
                    style={{ color: theme.colors.onSurfaceVariant }}
                    numberOfLines={1}>
                    {[item.phone, customerAddress(item)]
                      .filter(Boolean)
                      .join(' · ') || '—'}
                  </Text>
                </Pressable>
              ))
            )}
          </ScrollView>
          <Button onPress={() => setCustomerPickerOpen(false)}>Close</Button>
        </Modal>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexWrap: 'wrap',
    gap: 8,
  },
  topBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  topBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingRight: 8,
  },
  errorText: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
  },
  bodyRow: {
    flexDirection: 'row',
  },
  bodyColumn: {
    flexDirection: 'column',
  },
  leftColumn: {
    flex: 1.5,
  },
  leftColumnMobile: {
    flex: 1,
  },
  rightColumn: {
    flex: 1,
    padding: 12,
  },
  rightColumnMobile: {
    padding: 12,
    minHeight: 320,
  },
  tabs: {
    margin: 12,
  },
  panelScroll: {
    flex: 1,
  },
  panelContent: {
    padding: 12,
    paddingTop: 0,
  },
  panelGap: {
    gap: 16,
  },
  fieldLabel: {
    marginBottom: 6,
  },
  fieldLabelRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  checkPhoneButton: {
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  matchesSection: {
    gap: 10,
  },
  matchCard: {
    borderRadius: 10,
  },
  useContactButton: {
    marginTop: 10,
    alignSelf: 'flex-start',
  },
  selectField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 48,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  infoCard: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    gap: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoText: {
    flex: 1,
  },
  productList: {
    borderWidth: 1,
    borderRadius: 10,
    overflow: 'hidden',
    maxHeight: 420,
  },
  productScroll: {
    maxHeight: 420,
  },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  flex1: {
    flex: 1,
    minWidth: 0,
  },
  qtyPill: {
    minWidth: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categoryRow: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 2,
    paddingRight: 8,
  },
  categoryChip: {
    marginRight: 0,
  },
  viewToggle: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 10,
    padding: 2,
  },
  viewToggleBtn: {
    margin: 0,
    borderRadius: 8,
  },
  cardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    padding: 10,
  },
  pickCard: {
    flexGrow: 1,
    flexBasis: 160,
    maxWidth: 240,
    minWidth: 150,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    gap: 6,
  },
  pickCardImage: {
    alignSelf: 'center',
    width: '100%',
    height: 72,
    borderRadius: 8,
  },
  pickCardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 6,
  },
  pickCardName: {
    flex: 1,
    fontWeight: '700',
    minHeight: 38,
  },
  pickCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  summaryCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
  },
  summaryScroll: {
    flex: 1,
  },
  summaryEmpty: {
    padding: 24,
    alignItems: 'center',
  },
  orderTableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 6,
  },
  orderHeaderText: {
    fontWeight: '700',
    opacity: 0.75,
  },
  orderHeaderProduct: {
    flex: 1,
    minWidth: 0,
  },
  orderHeaderQty: {
    width: 128,
    textAlign: 'center',
  },
  orderHeaderPrice: {
    width: 96,
    textAlign: 'right',
  },
  orderHeaderDisc: {
    width: 72,
    textAlign: 'right',
  },
  orderHeaderAmount: {
    width: 100,
    textAlign: 'right',
  },
  orderHeaderDelete: {
    width: 36,
  },
  orderLineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 6,
  },
  orderProductCell: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minWidth: 0,
  },
  orderProductName: {
    flex: 1,
    fontWeight: '600',
    minWidth: 0,
  },
  qtyStepper: {
    width: 128,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  stepperBtn: {
    margin: 0,
    width: 32,
    height: 32,
  },
  qtyStepperInput: {
    flex: 1,
    height: 36,
    minWidth: 48,
  },
  orderPriceInput: {
    width: 96,
    height: 36,
  },
  orderDiscInput: {
    width: 72,
    height: 36,
  },
  orderInputContent: {
    textAlign: 'right',
    paddingVertical: 0,
    fontSize: 13,
  },
  orderAmountCell: {
    width: 100,
    textAlign: 'right',
    fontWeight: '700',
  },
  orderDeleteBtn: {
    margin: 0,
    width: 36,
  },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
  },
  pickerModal: {
    alignSelf: 'center',
    width: 460,
    maxWidth: '92%',
    maxHeight: '80%',
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  pickerTitle: {
    fontWeight: '700',
  },
  pickerList: {
    maxHeight: 360,
  },
  pickerRow: {
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  emptyText: {
    textAlign: 'center',
    opacity: 0.7,
    padding: 20,
  },
});
