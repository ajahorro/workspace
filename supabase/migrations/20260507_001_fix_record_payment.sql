-- Fix record_payment_v2 to accept receipt_url and ocr_text

CREATE OR REPLACE FUNCTION record_payment_v2(
  p_booking_id UUID,
  p_amount NUMERIC,
  p_method TEXT DEFAULT 'CASH',
  p_reference TEXT DEFAULT NULL,
  p_receipt_url TEXT DEFAULT NULL,
  p_ocr_text TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_price NUMERIC;
  v_total_paid NUMERIC;
  v_payment_id UUID;
  v_method payment_method_v2;
  v_status TEXT;
BEGIN
  -- Validate method
  BEGIN
    v_method := p_method::payment_method_v2;
  EXCEPTION WHEN invalid_text_representation THEN
    RAISE EXCEPTION 'Invalid payment method: %', p_method;
  END;

  -- Lock booking row and get total
  SELECT total_price INTO v_total_price
  FROM bookings_v2 WHERE id = p_booking_id FOR UPDATE;

  IF v_total_price IS NULL THEN
    RAISE EXCEPTION 'Booking not found';
  END IF;

  -- Get current total paid
  SELECT COALESCE(SUM(amount), 0) INTO v_total_paid
  FROM payments_v2
  WHERE booking_id = p_booking_id AND status = 'PAID';

  -- Overpayment check
  IF (v_total_paid + p_amount) > v_total_price THEN
    RAISE EXCEPTION 'Overpayment: already paid ₱% + ₱% exceeds total ₱%',
      v_total_paid, p_amount, v_total_price;
  END IF;

  -- Set status based on receipt
  IF p_receipt_url IS NOT NULL THEN
    v_status := 'FOR_VERIFICATION';
  ELSE
    v_status := 'PAID';
  END IF;

  -- Insert payment
  INSERT INTO payments_v2 (booking_id, amount, method, status, reference_number, receipt_url, ocr_text)
  VALUES (p_booking_id, p_amount, v_method, v_status, p_reference, p_receipt_url, p_ocr_text)
  RETURNING id INTO v_payment_id;

  RETURN v_payment_id;
END;
$$;
