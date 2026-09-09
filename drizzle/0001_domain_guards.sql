CREATE TRIGGER membership_overlap_insert BEFORE INSERT ON memberships
WHEN NEW.status <> 'CANCELLED'
BEGIN
 SELECT RAISE(ABORT, 'membership_overlap') WHERE EXISTS (
  SELECT 1 FROM memberships WHERE tenant_id=NEW.tenant_id AND member_id=NEW.member_id
  AND status<>'CANCELLED' AND end_date>=NEW.start_date AND start_date<=NEW.end_date
 );
END;
--> statement-breakpoint
CREATE TRIGGER membership_overlap_update BEFORE UPDATE OF status,start_date,end_date ON memberships
WHEN NEW.status <> 'CANCELLED'
BEGIN
 SELECT RAISE(ABORT, 'membership_overlap') WHERE EXISTS (
  SELECT 1 FROM memberships WHERE tenant_id=NEW.tenant_id AND member_id=NEW.member_id AND id<>NEW.id
  AND status<>'CANCELLED' AND end_date>=NEW.start_date AND start_date<=NEW.end_date
 );
END;
--> statement-breakpoint
CREATE TRIGGER paid_order_cancellation BEFORE UPDATE OF status ON orders
WHEN NEW.status='CANCELLED'
BEGIN
 SELECT RAISE(ABORT, 'paid_order_cancellation') WHERE EXISTS (
  SELECT 1 FROM payments WHERE tenant_id=NEW.tenant_id AND order_id=NEW.id AND status='CONFIRMED'
 );
END;
--> statement-breakpoint
CREATE TRIGGER payment_order_guard BEFORE INSERT ON payments
WHEN NEW.order_id IS NOT NULL AND NEW.order_id<>''
BEGIN
 SELECT RAISE(ABORT,'invalid_order_payment') WHERE NOT EXISTS (
  SELECT 1 FROM orders WHERE tenant_id=NEW.tenant_id AND id=NEW.order_id AND member_id=NEW.member_id AND status<>'CANCELLED'
 );
END;
--> statement-breakpoint
CREATE TRIGGER payment_membership_guard BEFORE INSERT ON payments
WHEN NEW.membership_id IS NOT NULL AND NEW.membership_id<>''
BEGIN
 SELECT RAISE(ABORT,'invalid_membership_payment') WHERE NOT EXISTS (
  SELECT 1 FROM memberships WHERE tenant_id=NEW.tenant_id AND id=NEW.membership_id AND member_id=NEW.member_id AND status<>'CANCELLED'
 );
END;
--> statement-breakpoint
CREATE TRIGGER attendance_active_membership BEFORE INSERT ON attendance
BEGIN
 SELECT RAISE(ABORT,'inactive_membership') WHERE NOT EXISTS (
  SELECT 1 FROM memberships s JOIN members m ON m.id=s.member_id AND m.tenant_id=s.tenant_id
  WHERE s.tenant_id=NEW.tenant_id AND s.member_id=NEW.member_id AND s.status='ACTIVE'
  AND s.start_date<=NEW.day AND s.end_date>=NEW.day AND m.status='ACTIVE'
 );
END;
