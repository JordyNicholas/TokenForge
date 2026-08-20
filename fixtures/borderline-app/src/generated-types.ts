/**
 * Hand-maintained API type surface for the internal billing service.
 * Mirrors the OpenAPI spec field-for-field; kept in sync manually by the
 * platform team (not run through a code generator). Large because the
 * billing API has a lot of resource types, not because it is junk.
 */


export interface ApiType0001 {
  /** Account id, resource #1. */
  id: string;
  /** Account createdAt, resource #1. */
  createdAt: string;
  /** Account updatedAt, resource #1. */
  updatedAt: string;
  /** Account status, resource #1. */
  status: "active" | "inactive" | "pending" | "archived";
  /** Account label, resource #1. */
  label: string;
  /** Account amountCents, resource #1. */
  amountCents: number;
  /** Account currency, resource #1. */
  currency: string;
  /** Account metadata, resource #1. */
  metadata: Record<string, string>;
  /** Account ownerId, resource #1. */
  ownerId: string;
  /** Account tags, resource #1. */
  tags: string[];
  /** Account notes, resource #1. */
  notes: string | null;
  /** Account version, resource #1. */
  version: number;
}

export interface ApiType0002 {
  /** Invoice id, resource #2. */
  id: string;
  /** Invoice createdAt, resource #2. */
  createdAt: string;
  /** Invoice updatedAt, resource #2. */
  updatedAt: string;
  /** Invoice status, resource #2. */
  status: "active" | "inactive" | "pending" | "archived";
  /** Invoice label, resource #2. */
  label: string;
  /** Invoice amountCents, resource #2. */
  amountCents: number;
  /** Invoice currency, resource #2. */
  currency: string;
  /** Invoice metadata, resource #2. */
  metadata: Record<string, string>;
  /** Invoice ownerId, resource #2. */
  ownerId: string;
  /** Invoice tags, resource #2. */
  tags: string[];
  /** Invoice notes, resource #2. */
  notes: string | null;
  /** Invoice version, resource #2. */
  version: number;
}

export interface ApiType0003 {
  /** Payment id, resource #3. */
  id: string;
  /** Payment createdAt, resource #3. */
  createdAt: string;
  /** Payment updatedAt, resource #3. */
  updatedAt: string;
  /** Payment status, resource #3. */
  status: "active" | "inactive" | "pending" | "archived";
  /** Payment label, resource #3. */
  label: string;
  /** Payment amountCents, resource #3. */
  amountCents: number;
  /** Payment currency, resource #3. */
  currency: string;
  /** Payment metadata, resource #3. */
  metadata: Record<string, string>;
  /** Payment ownerId, resource #3. */
  ownerId: string;
  /** Payment tags, resource #3. */
  tags: string[];
  /** Payment notes, resource #3. */
  notes: string | null;
  /** Payment version, resource #3. */
  version: number;
}

export interface ApiType0004 {
  /** Refund id, resource #4. */
  id: string;
  /** Refund createdAt, resource #4. */
  createdAt: string;
  /** Refund updatedAt, resource #4. */
  updatedAt: string;
  /** Refund status, resource #4. */
  status: "active" | "inactive" | "pending" | "archived";
  /** Refund label, resource #4. */
  label: string;
  /** Refund amountCents, resource #4. */
  amountCents: number;
  /** Refund currency, resource #4. */
  currency: string;
  /** Refund metadata, resource #4. */
  metadata: Record<string, string>;
  /** Refund ownerId, resource #4. */
  ownerId: string;
  /** Refund tags, resource #4. */
  tags: string[];
  /** Refund notes, resource #4. */
  notes: string | null;
  /** Refund version, resource #4. */
  version: number;
}

export interface ApiType0005 {
  /** Subscription id, resource #5. */
  id: string;
  /** Subscription createdAt, resource #5. */
  createdAt: string;
  /** Subscription updatedAt, resource #5. */
  updatedAt: string;
  /** Subscription status, resource #5. */
  status: "active" | "inactive" | "pending" | "archived";
  /** Subscription label, resource #5. */
  label: string;
  /** Subscription amountCents, resource #5. */
  amountCents: number;
  /** Subscription currency, resource #5. */
  currency: string;
  /** Subscription metadata, resource #5. */
  metadata: Record<string, string>;
  /** Subscription ownerId, resource #5. */
  ownerId: string;
  /** Subscription tags, resource #5. */
  tags: string[];
  /** Subscription notes, resource #5. */
  notes: string | null;
  /** Subscription version, resource #5. */
  version: number;
}

export interface ApiType0006 {
  /** Customer id, resource #6. */
  id: string;
  /** Customer createdAt, resource #6. */
  createdAt: string;
  /** Customer updatedAt, resource #6. */
  updatedAt: string;
  /** Customer status, resource #6. */
  status: "active" | "inactive" | "pending" | "archived";
  /** Customer label, resource #6. */
  label: string;
  /** Customer amountCents, resource #6. */
  amountCents: number;
  /** Customer currency, resource #6. */
  currency: string;
  /** Customer metadata, resource #6. */
  metadata: Record<string, string>;
  /** Customer ownerId, resource #6. */
  ownerId: string;
  /** Customer tags, resource #6. */
  tags: string[];
  /** Customer notes, resource #6. */
  notes: string | null;
  /** Customer version, resource #6. */
  version: number;
}

export interface ApiType0007 {
  /** Product id, resource #7. */
  id: string;
  /** Product createdAt, resource #7. */
  createdAt: string;
  /** Product updatedAt, resource #7. */
  updatedAt: string;
  /** Product status, resource #7. */
  status: "active" | "inactive" | "pending" | "archived";
  /** Product label, resource #7. */
  label: string;
  /** Product amountCents, resource #7. */
  amountCents: number;
  /** Product currency, resource #7. */
  currency: string;
  /** Product metadata, resource #7. */
  metadata: Record<string, string>;
  /** Product ownerId, resource #7. */
  ownerId: string;
  /** Product tags, resource #7. */
  tags: string[];
  /** Product notes, resource #7. */
  notes: string | null;
  /** Product version, resource #7. */
  version: number;
}

export interface ApiType0008 {
  /** Discount id, resource #8. */
  id: string;
  /** Discount createdAt, resource #8. */
  createdAt: string;
  /** Discount updatedAt, resource #8. */
  updatedAt: string;
  /** Discount status, resource #8. */
  status: "active" | "inactive" | "pending" | "archived";
  /** Discount label, resource #8. */
  label: string;
  /** Discount amountCents, resource #8. */
  amountCents: number;
  /** Discount currency, resource #8. */
  currency: string;
  /** Discount metadata, resource #8. */
  metadata: Record<string, string>;
  /** Discount ownerId, resource #8. */
  ownerId: string;
  /** Discount tags, resource #8. */
  tags: string[];
  /** Discount notes, resource #8. */
  notes: string | null;
  /** Discount version, resource #8. */
  version: number;
}

export interface ApiType0009 {
  /** Address id, resource #9. */
  id: string;
  /** Address createdAt, resource #9. */
  createdAt: string;
  /** Address updatedAt, resource #9. */
  updatedAt: string;
  /** Address status, resource #9. */
  status: "active" | "inactive" | "pending" | "archived";
  /** Address label, resource #9. */
  label: string;
  /** Address amountCents, resource #9. */
  amountCents: number;
  /** Address currency, resource #9. */
  currency: string;
  /** Address metadata, resource #9. */
  metadata: Record<string, string>;
  /** Address ownerId, resource #9. */
  ownerId: string;
  /** Address tags, resource #9. */
  tags: string[];
  /** Address notes, resource #9. */
  notes: string | null;
  /** Address version, resource #9. */
  version: number;
}

export interface ApiType0010 {
  /** Webhook id, resource #10. */
  id: string;
  /** Webhook createdAt, resource #10. */
  createdAt: string;
  /** Webhook updatedAt, resource #10. */
  updatedAt: string;
  /** Webhook status, resource #10. */
  status: "active" | "inactive" | "pending" | "archived";
  /** Webhook label, resource #10. */
  label: string;
  /** Webhook amountCents, resource #10. */
  amountCents: number;
  /** Webhook currency, resource #10. */
  currency: string;
  /** Webhook metadata, resource #10. */
  metadata: Record<string, string>;
  /** Webhook ownerId, resource #10. */
  ownerId: string;
  /** Webhook tags, resource #10. */
  tags: string[];
  /** Webhook notes, resource #10. */
  notes: string | null;
  /** Webhook version, resource #10. */
  version: number;
}

export interface ApiType0011 {
  /** ApiKey id, resource #11. */
  id: string;
  /** ApiKey createdAt, resource #11. */
  createdAt: string;
  /** ApiKey updatedAt, resource #11. */
  updatedAt: string;
  /** ApiKey status, resource #11. */
  status: "active" | "inactive" | "pending" | "archived";
  /** ApiKey label, resource #11. */
  label: string;
  /** ApiKey amountCents, resource #11. */
  amountCents: number;
  /** ApiKey currency, resource #11. */
  currency: string;
  /** ApiKey metadata, resource #11. */
  metadata: Record<string, string>;
  /** ApiKey ownerId, resource #11. */
  ownerId: string;
  /** ApiKey tags, resource #11. */
  tags: string[];
  /** ApiKey notes, resource #11. */
  notes: string | null;
  /** ApiKey version, resource #11. */
  version: number;
}

export interface ApiType0012 {
  /** AuditLog id, resource #12. */
  id: string;
  /** AuditLog createdAt, resource #12. */
  createdAt: string;
  /** AuditLog updatedAt, resource #12. */
  updatedAt: string;
  /** AuditLog status, resource #12. */
  status: "active" | "inactive" | "pending" | "archived";
  /** AuditLog label, resource #12. */
  label: string;
  /** AuditLog amountCents, resource #12. */
  amountCents: number;
  /** AuditLog currency, resource #12. */
  currency: string;
  /** AuditLog metadata, resource #12. */
  metadata: Record<string, string>;
  /** AuditLog ownerId, resource #12. */
  ownerId: string;
  /** AuditLog tags, resource #12. */
  tags: string[];
  /** AuditLog notes, resource #12. */
  notes: string | null;
  /** AuditLog version, resource #12. */
  version: number;
}

export interface ApiType0013 {
  /** Account id, resource #13. */
  id: string;
  /** Account createdAt, resource #13. */
  createdAt: string;
  /** Account updatedAt, resource #13. */
  updatedAt: string;
  /** Account status, resource #13. */
  status: "active" | "inactive" | "pending" | "archived";
  /** Account label, resource #13. */
  label: string;
  /** Account amountCents, resource #13. */
  amountCents: number;
  /** Account currency, resource #13. */
  currency: string;
  /** Account metadata, resource #13. */
  metadata: Record<string, string>;
  /** Account ownerId, resource #13. */
  ownerId: string;
  /** Account tags, resource #13. */
  tags: string[];
  /** Account notes, resource #13. */
  notes: string | null;
  /** Account version, resource #13. */
  version: number;
}

export interface ApiType0014 {
  /** Invoice id, resource #14. */
  id: string;
  /** Invoice createdAt, resource #14. */
  createdAt: string;
  /** Invoice updatedAt, resource #14. */
  updatedAt: string;
  /** Invoice status, resource #14. */
  status: "active" | "inactive" | "pending" | "archived";
  /** Invoice label, resource #14. */
  label: string;
  /** Invoice amountCents, resource #14. */
  amountCents: number;
  /** Invoice currency, resource #14. */
  currency: string;
  /** Invoice metadata, resource #14. */
  metadata: Record<string, string>;
  /** Invoice ownerId, resource #14. */
  ownerId: string;
  /** Invoice tags, resource #14. */
  tags: string[];
  /** Invoice notes, resource #14. */
  notes: string | null;
  /** Invoice version, resource #14. */
  version: number;
}

export interface ApiType0015 {
  /** Payment id, resource #15. */
  id: string;
  /** Payment createdAt, resource #15. */
  createdAt: string;
  /** Payment updatedAt, resource #15. */
  updatedAt: string;
  /** Payment status, resource #15. */
  status: "active" | "inactive" | "pending" | "archived";
  /** Payment label, resource #15. */
  label: string;
  /** Payment amountCents, resource #15. */
  amountCents: number;
  /** Payment currency, resource #15. */
  currency: string;
  /** Payment metadata, resource #15. */
  metadata: Record<string, string>;
  /** Payment ownerId, resource #15. */
  ownerId: string;
  /** Payment tags, resource #15. */
  tags: string[];
  /** Payment notes, resource #15. */
  notes: string | null;
  /** Payment version, resource #15. */
  version: number;
}

export interface ApiType0016 {
  /** Refund id, resource #16. */
  id: string;
  /** Refund createdAt, resource #16. */
  createdAt: string;
  /** Refund updatedAt, resource #16. */
  updatedAt: string;
  /** Refund status, resource #16. */
  status: "active" | "inactive" | "pending" | "archived";
  /** Refund label, resource #16. */
  label: string;
  /** Refund amountCents, resource #16. */
  amountCents: number;
  /** Refund currency, resource #16. */
  currency: string;
  /** Refund metadata, resource #16. */
  metadata: Record<string, string>;
  /** Refund ownerId, resource #16. */
  ownerId: string;
  /** Refund tags, resource #16. */
  tags: string[];
  /** Refund notes, resource #16. */
  notes: string | null;
  /** Refund version, resource #16. */
  version: number;
}

export interface ApiType0017 {
  /** Subscription id, resource #17. */
  id: string;
  /** Subscription createdAt, resource #17. */
  createdAt: string;
  /** Subscription updatedAt, resource #17. */
  updatedAt: string;
  /** Subscription status, resource #17. */
  status: "active" | "inactive" | "pending" | "archived";
  /** Subscription label, resource #17. */
  label: string;
  /** Subscription amountCents, resource #17. */
  amountCents: number;
  /** Subscription currency, resource #17. */
  currency: string;
  /** Subscription metadata, resource #17. */
  metadata: Record<string, string>;
  /** Subscription ownerId, resource #17. */
  ownerId: string;
  /** Subscription tags, resource #17. */
  tags: string[];
  /** Subscription notes, resource #17. */
  notes: string | null;
  /** Subscription version, resource #17. */
  version: number;
}

export interface ApiType0018 {
  /** Customer id, resource #18. */
  id: string;
  /** Customer createdAt, resource #18. */
  createdAt: string;
  /** Customer updatedAt, resource #18. */
  updatedAt: string;
  /** Customer status, resource #18. */
  status: "active" | "inactive" | "pending" | "archived";
  /** Customer label, resource #18. */
  label: string;
  /** Customer amountCents, resource #18. */
  amountCents: number;
  /** Customer currency, resource #18. */
  currency: string;
  /** Customer metadata, resource #18. */
  metadata: Record<string, string>;
  /** Customer ownerId, resource #18. */
  ownerId: string;
  /** Customer tags, resource #18. */
  tags: string[];
  /** Customer notes, resource #18. */
  notes: string | null;
  /** Customer version, resource #18. */
  version: number;
}

export interface ApiType0019 {
  /** Product id, resource #19. */
  id: string;
  /** Product createdAt, resource #19. */
  createdAt: string;
  /** Product updatedAt, resource #19. */
  updatedAt: string;
  /** Product status, resource #19. */
  status: "active" | "inactive" | "pending" | "archived";
  /** Product label, resource #19. */
  label: string;
  /** Product amountCents, resource #19. */
  amountCents: number;
  /** Product currency, resource #19. */
  currency: string;
  /** Product metadata, resource #19. */
  metadata: Record<string, string>;
  /** Product ownerId, resource #19. */
  ownerId: string;
  /** Product tags, resource #19. */
  tags: string[];
  /** Product notes, resource #19. */
  notes: string | null;
  /** Product version, resource #19. */
  version: number;
}

export interface ApiType0020 {
  /** Discount id, resource #20. */
  id: string;
  /** Discount createdAt, resource #20. */
  createdAt: string;
  /** Discount updatedAt, resource #20. */
  updatedAt: string;
  /** Discount status, resource #20. */
  status: "active" | "inactive" | "pending" | "archived";
  /** Discount label, resource #20. */
  label: string;
  /** Discount amountCents, resource #20. */
  amountCents: number;
  /** Discount currency, resource #20. */
  currency: string;
  /** Discount metadata, resource #20. */
  metadata: Record<string, string>;
  /** Discount ownerId, resource #20. */
  ownerId: string;
  /** Discount tags, resource #20. */
  tags: string[];
  /** Discount notes, resource #20. */
  notes: string | null;
  /** Discount version, resource #20. */
  version: number;
}

export interface ApiType0021 {
  /** Address id, resource #21. */
  id: string;
  /** Address createdAt, resource #21. */
  createdAt: string;
  /** Address updatedAt, resource #21. */
  updatedAt: string;
  /** Address status, resource #21. */
  status: "active" | "inactive" | "pending" | "archived";
  /** Address label, resource #21. */
  label: string;
  /** Address amountCents, resource #21. */
  amountCents: number;
  /** Address currency, resource #21. */
  currency: string;
  /** Address metadata, resource #21. */
  metadata: Record<string, string>;
  /** Address ownerId, resource #21. */
  ownerId: string;
  /** Address tags, resource #21. */
  tags: string[];
  /** Address notes, resource #21. */
  notes: string | null;
  /** Address version, resource #21. */
  version: number;
}

export interface ApiType0022 {
  /** Webhook id, resource #22. */
  id: string;
  /** Webhook createdAt, resource #22. */
  createdAt: string;
  /** Webhook updatedAt, resource #22. */
  updatedAt: string;
  /** Webhook status, resource #22. */
  status: "active" | "inactive" | "pending" | "archived";
  /** Webhook label, resource #22. */
  label: string;
  /** Webhook amountCents, resource #22. */
  amountCents: number;
  /** Webhook currency, resource #22. */
  currency: string;
  /** Webhook metadata, resource #22. */
  metadata: Record<string, string>;
  /** Webhook ownerId, resource #22. */
  ownerId: string;
  /** Webhook tags, resource #22. */
  tags: string[];
  /** Webhook notes, resource #22. */
  notes: string | null;
  /** Webhook version, resource #22. */
  version: number;
}

export interface ApiType0023 {
  /** ApiKey id, resource #23. */
  id: string;
  /** ApiKey createdAt, resource #23. */
  createdAt: string;
  /** ApiKey updatedAt, resource #23. */
  updatedAt: string;
  /** ApiKey status, resource #23. */
  status: "active" | "inactive" | "pending" | "archived";
  /** ApiKey label, resource #23. */
  label: string;
  /** ApiKey amountCents, resource #23. */
  amountCents: number;
  /** ApiKey currency, resource #23. */
  currency: string;
  /** ApiKey metadata, resource #23. */
  metadata: Record<string, string>;
  /** ApiKey ownerId, resource #23. */
  ownerId: string;
  /** ApiKey tags, resource #23. */
  tags: string[];
  /** ApiKey notes, resource #23. */
  notes: string | null;
  /** ApiKey version, resource #23. */
  version: number;
}

export interface ApiType0024 {
  /** AuditLog id, resource #24. */
  id: string;
  /** AuditLog createdAt, resource #24. */
  createdAt: string;
  /** AuditLog updatedAt, resource #24. */
  updatedAt: string;
  /** AuditLog status, resource #24. */
  status: "active" | "inactive" | "pending" | "archived";
  /** AuditLog label, resource #24. */
  label: string;
  /** AuditLog amountCents, resource #24. */
  amountCents: number;
  /** AuditLog currency, resource #24. */
  currency: string;
  /** AuditLog metadata, resource #24. */
  metadata: Record<string, string>;
  /** AuditLog ownerId, resource #24. */
  ownerId: string;
  /** AuditLog tags, resource #24. */
  tags: string[];
  /** AuditLog notes, resource #24. */
  notes: string | null;
  /** AuditLog version, resource #24. */
  version: number;
}

export interface ApiType0025 {
  /** Account id, resource #25. */
  id: string;
  /** Account createdAt, resource #25. */
  createdAt: string;
  /** Account updatedAt, resource #25. */
  updatedAt: string;
  /** Account status, resource #25. */
  status: "active" | "inactive" | "pending" | "archived";
  /** Account label, resource #25. */
  label: string;
  /** Account amountCents, resource #25. */
  amountCents: number;
  /** Account currency, resource #25. */
  currency: string;
  /** Account metadata, resource #25. */
  metadata: Record<string, string>;
  /** Account ownerId, resource #25. */
  ownerId: string;
  /** Account tags, resource #25. */
  tags: string[];
  /** Account notes, resource #25. */
  notes: string | null;
  /** Account version, resource #25. */
  version: number;
}

export interface ApiType0026 {
  /** Invoice id, resource #26. */
  id: string;
  /** Invoice createdAt, resource #26. */
  createdAt: string;
  /** Invoice updatedAt, resource #26. */
  updatedAt: string;
  /** Invoice status, resource #26. */
  status: "active" | "inactive" | "pending" | "archived";
  /** Invoice label, resource #26. */
  label: string;
  /** Invoice amountCents, resource #26. */
  amountCents: number;
  /** Invoice currency, resource #26. */
  currency: string;
  /** Invoice metadata, resource #26. */
  metadata: Record<string, string>;
  /** Invoice ownerId, resource #26. */
  ownerId: string;
  /** Invoice tags, resource #26. */
  tags: string[];
  /** Invoice notes, resource #26. */
  notes: string | null;
  /** Invoice version, resource #26. */
  version: number;
}

export interface ApiType0027 {
  /** Payment id, resource #27. */
  id: string;
  /** Payment createdAt, resource #27. */
  createdAt: string;
  /** Payment updatedAt, resource #27. */
  updatedAt: string;
  /** Payment status, resource #27. */
  status: "active" | "inactive" | "pending" | "archived";
  /** Payment label, resource #27. */
  label: string;
  /** Payment amountCents, resource #27. */
  amountCents: number;
  /** Payment currency, resource #27. */
  currency: string;
  /** Payment metadata, resource #27. */
  metadata: Record<string, string>;
  /** Payment ownerId, resource #27. */
  ownerId: string;
  /** Payment tags, resource #27. */
  tags: string[];
  /** Payment notes, resource #27. */
  notes: string | null;
  /** Payment version, resource #27. */
  version: number;
}

export interface ApiType0028 {
  /** Refund id, resource #28. */
  id: string;
  /** Refund createdAt, resource #28. */
  createdAt: string;
  /** Refund updatedAt, resource #28. */
  updatedAt: string;
  /** Refund status, resource #28. */
  status: "active" | "inactive" | "pending" | "archived";
  /** Refund label, resource #28. */
  label: string;
  /** Refund amountCents, resource #28. */
  amountCents: number;
  /** Refund currency, resource #28. */
  currency: string;
  /** Refund metadata, resource #28. */
  metadata: Record<string, string>;
  /** Refund ownerId, resource #28. */
  ownerId: string;
  /** Refund tags, resource #28. */
  tags: string[];
  /** Refund notes, resource #28. */
  notes: string | null;
  /** Refund version, resource #28. */
  version: number;
}

export interface ApiType0029 {
  /** Subscription id, resource #29. */
  id: string;
  /** Subscription createdAt, resource #29. */
  createdAt: string;
  /** Subscription updatedAt, resource #29. */
  updatedAt: string;
  /** Subscription status, resource #29. */
  status: "active" | "inactive" | "pending" | "archived";
  /** Subscription label, resource #29. */
  label: string;
  /** Subscription amountCents, resource #29. */
  amountCents: number;
  /** Subscription currency, resource #29. */
  currency: string;
  /** Subscription metadata, resource #29. */
  metadata: Record<string, string>;
  /** Subscription ownerId, resource #29. */
  ownerId: string;
  /** Subscription tags, resource #29. */
  tags: string[];
  /** Subscription notes, resource #29. */
  notes: string | null;
  /** Subscription version, resource #29. */
  version: number;
}

export interface ApiType0030 {
  /** Customer id, resource #30. */
  id: string;
  /** Customer createdAt, resource #30. */
  createdAt: string;
  /** Customer updatedAt, resource #30. */
  updatedAt: string;
  /** Customer status, resource #30. */
  status: "active" | "inactive" | "pending" | "archived";
  /** Customer label, resource #30. */
  label: string;
  /** Customer amountCents, resource #30. */
  amountCents: number;
  /** Customer currency, resource #30. */
  currency: string;
  /** Customer metadata, resource #30. */
  metadata: Record<string, string>;
  /** Customer ownerId, resource #30. */
  ownerId: string;
  /** Customer tags, resource #30. */
  tags: string[];
  /** Customer notes, resource #30. */
  notes: string | null;
  /** Customer version, resource #30. */
  version: number;
}

export interface ApiType0031 {
  /** Product id, resource #31. */
  id: string;
  /** Product createdAt, resource #31. */
  createdAt: string;
  /** Product updatedAt, resource #31. */
  updatedAt: string;
  /** Product status, resource #31. */
  status: "active" | "inactive" | "pending" | "archived";
  /** Product label, resource #31. */
  label: string;
  /** Product amountCents, resource #31. */
  amountCents: number;
  /** Product currency, resource #31. */
  currency: string;
  /** Product metadata, resource #31. */
  metadata: Record<string, string>;
  /** Product ownerId, resource #31. */
  ownerId: string;
  /** Product tags, resource #31. */
  tags: string[];
  /** Product notes, resource #31. */
  notes: string | null;
  /** Product version, resource #31. */
  version: number;
}

export interface ApiType0032 {
  /** Discount id, resource #32. */
  id: string;
  /** Discount createdAt, resource #32. */
  createdAt: string;
  /** Discount updatedAt, resource #32. */
  updatedAt: string;
  /** Discount status, resource #32. */
  status: "active" | "inactive" | "pending" | "archived";
  /** Discount label, resource #32. */
  label: string;
  /** Discount amountCents, resource #32. */
  amountCents: number;
  /** Discount currency, resource #32. */
  currency: string;
  /** Discount metadata, resource #32. */
  metadata: Record<string, string>;
  /** Discount ownerId, resource #32. */
  ownerId: string;
  /** Discount tags, resource #32. */
  tags: string[];
  /** Discount notes, resource #32. */
  notes: string | null;
  /** Discount version, resource #32. */
  version: number;
}

export interface ApiType0033 {
  /** Address id, resource #33. */
  id: string;
  /** Address createdAt, resource #33. */
  createdAt: string;
  /** Address updatedAt, resource #33. */
  updatedAt: string;
  /** Address status, resource #33. */
  status: "active" | "inactive" | "pending" | "archived";
  /** Address label, resource #33. */
  label: string;
  /** Address amountCents, resource #33. */
  amountCents: number;
  /** Address currency, resource #33. */
  currency: string;
  /** Address metadata, resource #33. */
  metadata: Record<string, string>;
  /** Address ownerId, resource #33. */
  ownerId: string;
  /** Address tags, resource #33. */
  tags: string[];
  /** Address notes, resource #33. */
  notes: string | null;
  /** Address version, resource #33. */
  version: number;
}

export interface ApiType0034 {
  /** Webhook id, resource #34. */
  id: string;
  /** Webhook createdAt, resource #34. */
  createdAt: string;
  /** Webhook updatedAt, resource #34. */
  updatedAt: string;
  /** Webhook status, resource #34. */
  status: "active" | "inactive" | "pending" | "archived";
  /** Webhook label, resource #34. */
  label: string;
  /** Webhook amountCents, resource #34. */
  amountCents: number;
  /** Webhook currency, resource #34. */
  currency: string;
  /** Webhook metadata, resource #34. */
  metadata: Record<string, string>;
  /** Webhook ownerId, resource #34. */
  ownerId: string;
  /** Webhook tags, resource #34. */
  tags: string[];
  /** Webhook notes, resource #34. */
  notes: string | null;
  /** Webhook version, resource #34. */
  version: number;
}

export interface ApiType0035 {
  /** ApiKey id, resource #35. */
  id: string;
  /** ApiKey createdAt, resource #35. */
  createdAt: string;
  /** ApiKey updatedAt, resource #35. */
  updatedAt: string;
  /** ApiKey status, resource #35. */
  status: "active" | "inactive" | "pending" | "archived";
  /** ApiKey label, resource #35. */
  label: string;
  /** ApiKey amountCents, resource #35. */
  amountCents: number;
  /** ApiKey currency, resource #35. */
  currency: string;
  /** ApiKey metadata, resource #35. */
  metadata: Record<string, string>;
  /** ApiKey ownerId, resource #35. */
  ownerId: string;
  /** ApiKey tags, resource #35. */
  tags: string[];
  /** ApiKey notes, resource #35. */
  notes: string | null;
  /** ApiKey version, resource #35. */
  version: number;
}

export interface ApiType0036 {
  /** AuditLog id, resource #36. */
  id: string;
  /** AuditLog createdAt, resource #36. */
  createdAt: string;
  /** AuditLog updatedAt, resource #36. */
  updatedAt: string;
  /** AuditLog status, resource #36. */
  status: "active" | "inactive" | "pending" | "archived";
  /** AuditLog label, resource #36. */
  label: string;
  /** AuditLog amountCents, resource #36. */
  amountCents: number;
  /** AuditLog currency, resource #36. */
  currency: string;
  /** AuditLog metadata, resource #36. */
  metadata: Record<string, string>;
  /** AuditLog ownerId, resource #36. */
  ownerId: string;
  /** AuditLog tags, resource #36. */
  tags: string[];
  /** AuditLog notes, resource #36. */
  notes: string | null;
  /** AuditLog version, resource #36. */
  version: number;
}

export interface ApiType0037 {
  /** Account id, resource #37. */
  id: string;
  /** Account createdAt, resource #37. */
  createdAt: string;
  /** Account updatedAt, resource #37. */
  updatedAt: string;
  /** Account status, resource #37. */
  status: "active" | "inactive" | "pending" | "archived";
  /** Account label, resource #37. */
  label: string;
  /** Account amountCents, resource #37. */
  amountCents: number;
  /** Account currency, resource #37. */
  currency: string;
  /** Account metadata, resource #37. */
  metadata: Record<string, string>;
  /** Account ownerId, resource #37. */
  ownerId: string;
  /** Account tags, resource #37. */
  tags: string[];
  /** Account notes, resource #37. */
  notes: string | null;
  /** Account version, resource #37. */
  version: number;
}

export interface ApiType0038 {
  /** Invoice id, resource #38. */
  id: string;
  /** Invoice createdAt, resource #38. */
  createdAt: string;
  /** Invoice updatedAt, resource #38. */
  updatedAt: string;
  /** Invoice status, resource #38. */
  status: "active" | "inactive" | "pending" | "archived";
  /** Invoice label, resource #38. */
  label: string;
  /** Invoice amountCents, resource #38. */
  amountCents: number;
  /** Invoice currency, resource #38. */
  currency: string;
  /** Invoice metadata, resource #38. */
  metadata: Record<string, string>;
  /** Invoice ownerId, resource #38. */
  ownerId: string;
  /** Invoice tags, resource #38. */
  tags: string[];
  /** Invoice notes, resource #38. */
  notes: string | null;
  /** Invoice version, resource #38. */
  version: number;
}

export interface ApiType0039 {
  /** Payment id, resource #39. */
  id: string;
  /** Payment createdAt, resource #39. */
  createdAt: string;
  /** Payment updatedAt, resource #39. */
  updatedAt: string;
  /** Payment status, resource #39. */
  status: "active" | "inactive" | "pending" | "archived";
  /** Payment label, resource #39. */
  label: string;
  /** Payment amountCents, resource #39. */
  amountCents: number;
  /** Payment currency, resource #39. */
  currency: string;
  /** Payment metadata, resource #39. */
  metadata: Record<string, string>;
  /** Payment ownerId, resource #39. */
  ownerId: string;
  /** Payment tags, resource #39. */
  tags: string[];
  /** Payment notes, resource #39. */
  notes: string | null;
  /** Payment version, resource #39. */
  version: number;
}

export interface ApiType0040 {
  /** Refund id, resource #40. */
  id: string;
  /** Refund createdAt, resource #40. */
  createdAt: string;
  /** Refund updatedAt, resource #40. */
  updatedAt: string;
  /** Refund status, resource #40. */
  status: "active" | "inactive" | "pending" | "archived";
  /** Refund label, resource #40. */
  label: string;
  /** Refund amountCents, resource #40. */
  amountCents: number;
  /** Refund currency, resource #40. */
  currency: string;
  /** Refund metadata, resource #40. */
  metadata: Record<string, string>;
  /** Refund ownerId, resource #40. */
  ownerId: string;
  /** Refund tags, resource #40. */
  tags: string[];
  /** Refund notes, resource #40. */
  notes: string | null;
  /** Refund version, resource #40. */
  version: number;
}

export interface ApiType0041 {
  /** Subscription id, resource #41. */
  id: string;
  /** Subscription createdAt, resource #41. */
  createdAt: string;
  /** Subscription updatedAt, resource #41. */
  updatedAt: string;
  /** Subscription status, resource #41. */
  status: "active" | "inactive" | "pending" | "archived";
  /** Subscription label, resource #41. */
  label: string;
  /** Subscription amountCents, resource #41. */
  amountCents: number;
  /** Subscription currency, resource #41. */
  currency: string;
  /** Subscription metadata, resource #41. */
  metadata: Record<string, string>;
  /** Subscription ownerId, resource #41. */
  ownerId: string;
  /** Subscription tags, resource #41. */
  tags: string[];
  /** Subscription notes, resource #41. */
  notes: string | null;
  /** Subscription version, resource #41. */
  version: number;
}

export interface ApiType0042 {
  /** Customer id, resource #42. */
  id: string;
  /** Customer createdAt, resource #42. */
  createdAt: string;
  /** Customer updatedAt, resource #42. */
  updatedAt: string;
  /** Customer status, resource #42. */
  status: "active" | "inactive" | "pending" | "archived";
  /** Customer label, resource #42. */
  label: string;
  /** Customer amountCents, resource #42. */
  amountCents: number;
  /** Customer currency, resource #42. */
  currency: string;
  /** Customer metadata, resource #42. */
  metadata: Record<string, string>;
  /** Customer ownerId, resource #42. */
  ownerId: string;
  /** Customer tags, resource #42. */
  tags: string[];
  /** Customer notes, resource #42. */
  notes: string | null;
  /** Customer version, resource #42. */
  version: number;
}

export interface ApiType0043 {
  /** Product id, resource #43. */
  id: string;
  /** Product createdAt, resource #43. */
  createdAt: string;
  /** Product updatedAt, resource #43. */
  updatedAt: string;
  /** Product status, resource #43. */
  status: "active" | "inactive" | "pending" | "archived";
  /** Product label, resource #43. */
  label: string;
  /** Product amountCents, resource #43. */
  amountCents: number;
  /** Product currency, resource #43. */
  currency: string;
  /** Product metadata, resource #43. */
  metadata: Record<string, string>;
  /** Product ownerId, resource #43. */
  ownerId: string;
  /** Product tags, resource #43. */
  tags: string[];
  /** Product notes, resource #43. */
  notes: string | null;
  /** Product version, resource #43. */
  version: number;
}

export interface ApiType0044 {
  /** Discount id, resource #44. */
  id: string;
  /** Discount createdAt, resource #44. */
  createdAt: string;
  /** Discount updatedAt, resource #44. */
  updatedAt: string;
  /** Discount status, resource #44. */
  status: "active" | "inactive" | "pending" | "archived";
  /** Discount label, resource #44. */
  label: string;
  /** Discount amountCents, resource #44. */
  amountCents: number;
  /** Discount currency, resource #44. */
  currency: string;
  /** Discount metadata, resource #44. */
  metadata: Record<string, string>;
  /** Discount ownerId, resource #44. */
  ownerId: string;
  /** Discount tags, resource #44. */
  tags: string[];
  /** Discount notes, resource #44. */
  notes: string | null;
  /** Discount version, resource #44. */
  version: number;
}

export interface ApiType0045 {
  /** Address id, resource #45. */
  id: string;
  /** Address createdAt, resource #45. */
  createdAt: string;
  /** Address updatedAt, resource #45. */
  updatedAt: string;
  /** Address status, resource #45. */
  status: "active" | "inactive" | "pending" | "archived";
  /** Address label, resource #45. */
  label: string;
  /** Address amountCents, resource #45. */
  amountCents: number;
  /** Address currency, resource #45. */
  currency: string;
  /** Address metadata, resource #45. */
  metadata: Record<string, string>;
  /** Address ownerId, resource #45. */
  ownerId: string;
  /** Address tags, resource #45. */
  tags: string[];
  /** Address notes, resource #45. */
  notes: string | null;
  /** Address version, resource #45. */
  version: number;
}

export interface ApiType0046 {
  /** Webhook id, resource #46. */
  id: string;
  /** Webhook createdAt, resource #46. */
  createdAt: string;
  /** Webhook updatedAt, resource #46. */
  updatedAt: string;
  /** Webhook status, resource #46. */
  status: "active" | "inactive" | "pending" | "archived";
  /** Webhook label, resource #46. */
  label: string;
  /** Webhook amountCents, resource #46. */
  amountCents: number;
  /** Webhook currency, resource #46. */
  currency: string;
  /** Webhook metadata, resource #46. */
  metadata: Record<string, string>;
  /** Webhook ownerId, resource #46. */
  ownerId: string;
  /** Webhook tags, resource #46. */
  tags: string[];
  /** Webhook notes, resource #46. */
  notes: string | null;
  /** Webhook version, resource #46. */
  version: number;
}

export interface ApiType0047 {
  /** ApiKey id, resource #47. */
  id: string;
  /** ApiKey createdAt, resource #47. */
  createdAt: string;
  /** ApiKey updatedAt, resource #47. */
  updatedAt: string;
  /** ApiKey status, resource #47. */
  status: "active" | "inactive" | "pending" | "archived";
  /** ApiKey label, resource #47. */
  label: string;
  /** ApiKey amountCents, resource #47. */
  amountCents: number;
  /** ApiKey currency, resource #47. */
  currency: string;
  /** ApiKey metadata, resource #47. */
  metadata: Record<string, string>;
  /** ApiKey ownerId, resource #47. */
  ownerId: string;
  /** ApiKey tags, resource #47. */
  tags: string[];
  /** ApiKey notes, resource #47. */
  notes: string | null;
  /** ApiKey version, resource #47. */
  version: number;
}

export interface ApiType0048 {
  /** AuditLog id, resource #48. */
  id: string;
  /** AuditLog createdAt, resource #48. */
  createdAt: string;
  /** AuditLog updatedAt, resource #48. */
  updatedAt: string;
  /** AuditLog status, resource #48. */
  status: "active" | "inactive" | "pending" | "archived";
  /** AuditLog label, resource #48. */
  label: string;
  /** AuditLog amountCents, resource #48. */
  amountCents: number;
  /** AuditLog currency, resource #48. */
  currency: string;
  /** AuditLog metadata, resource #48. */
  metadata: Record<string, string>;
  /** AuditLog ownerId, resource #48. */
  ownerId: string;
  /** AuditLog tags, resource #48. */
  tags: string[];
  /** AuditLog notes, resource #48. */
  notes: string | null;
  /** AuditLog version, resource #48. */
  version: number;
}

export interface ApiType0049 {
  /** Account id, resource #49. */
  id: string;
  /** Account createdAt, resource #49. */
  createdAt: string;
  /** Account updatedAt, resource #49. */
  updatedAt: string;
  /** Account status, resource #49. */
  status: "active" | "inactive" | "pending" | "archived";
  /** Account label, resource #49. */
  label: string;
  /** Account amountCents, resource #49. */
  amountCents: number;
  /** Account currency, resource #49. */
  currency: string;
  /** Account metadata, resource #49. */
  metadata: Record<string, string>;
  /** Account ownerId, resource #49. */
  ownerId: string;
  /** Account tags, resource #49. */
  tags: string[];
  /** Account notes, resource #49. */
  notes: string | null;
  /** Account version, resource #49. */
  version: number;
}

export interface ApiType0050 {
  /** Invoice id, resource #50. */
  id: string;
  /** Invoice createdAt, resource #50. */
  createdAt: string;
  /** Invoice updatedAt, resource #50. */
  updatedAt: string;
  /** Invoice status, resource #50. */
  status: "active" | "inactive" | "pending" | "archived";
  /** Invoice label, resource #50. */
  label: string;
  /** Invoice amountCents, resource #50. */
  amountCents: number;
  /** Invoice currency, resource #50. */
  currency: string;
  /** Invoice metadata, resource #50. */
  metadata: Record<string, string>;
  /** Invoice ownerId, resource #50. */
  ownerId: string;
  /** Invoice tags, resource #50. */
  tags: string[];
  /** Invoice notes, resource #50. */
  notes: string | null;
  /** Invoice version, resource #50. */
  version: number;
}

export interface ApiType0051 {
  /** Payment id, resource #51. */
  id: string;
  /** Payment createdAt, resource #51. */
  createdAt: string;
  /** Payment updatedAt, resource #51. */
  updatedAt: string;
  /** Payment status, resource #51. */
  status: "active" | "inactive" | "pending" | "archived";
  /** Payment label, resource #51. */
  label: string;
  /** Payment amountCents, resource #51. */
  amountCents: number;
  /** Payment currency, resource #51. */
  currency: string;
  /** Payment metadata, resource #51. */
  metadata: Record<string, string>;
  /** Payment ownerId, resource #51. */
  ownerId: string;
  /** Payment tags, resource #51. */
  tags: string[];
  /** Payment notes, resource #51. */
  notes: string | null;
  /** Payment version, resource #51. */
  version: number;
}

export interface ApiType0052 {
  /** Refund id, resource #52. */
  id: string;
  /** Refund createdAt, resource #52. */
  createdAt: string;
  /** Refund updatedAt, resource #52. */
  updatedAt: string;
  /** Refund status, resource #52. */
  status: "active" | "inactive" | "pending" | "archived";
  /** Refund label, resource #52. */
  label: string;
  /** Refund amountCents, resource #52. */
  amountCents: number;
  /** Refund currency, resource #52. */
  currency: string;
  /** Refund metadata, resource #52. */
  metadata: Record<string, string>;
  /** Refund ownerId, resource #52. */
  ownerId: string;
  /** Refund tags, resource #52. */
  tags: string[];
  /** Refund notes, resource #52. */
  notes: string | null;
  /** Refund version, resource #52. */
  version: number;
}

export interface ApiType0053 {
  /** Subscription id, resource #53. */
  id: string;
  /** Subscription createdAt, resource #53. */
  createdAt: string;
  /** Subscription updatedAt, resource #53. */
  updatedAt: string;
  /** Subscription status, resource #53. */
  status: "active" | "inactive" | "pending" | "archived";
  /** Subscription label, resource #53. */
  label: string;
  /** Subscription amountCents, resource #53. */
  amountCents: number;
  /** Subscription currency, resource #53. */
  currency: string;
  /** Subscription metadata, resource #53. */
  metadata: Record<string, string>;
  /** Subscription ownerId, resource #53. */
  ownerId: string;
  /** Subscription tags, resource #53. */
  tags: string[];
  /** Subscription notes, resource #53. */
  notes: string | null;
  /** Subscription version, resource #53. */
  version: number;
}

export interface ApiType0054 {
  /** Customer id, resource #54. */
  id: string;
  /** Customer createdAt, resource #54. */
  createdAt: string;
  /** Customer updatedAt, resource #54. */
  updatedAt: string;
  /** Customer status, resource #54. */
  status: "active" | "inactive" | "pending" | "archived";
  /** Customer label, resource #54. */
  label: string;
  /** Customer amountCents, resource #54. */
  amountCents: number;
  /** Customer currency, resource #54. */
  currency: string;
  /** Customer metadata, resource #54. */
  metadata: Record<string, string>;
  /** Customer ownerId, resource #54. */
  ownerId: string;
  /** Customer tags, resource #54. */
  tags: string[];
  /** Customer notes, resource #54. */
  notes: string | null;
  /** Customer version, resource #54. */
  version: number;
}

export interface ApiType0055 {
  /** Product id, resource #55. */
  id: string;
  /** Product createdAt, resource #55. */
  createdAt: string;
  /** Product updatedAt, resource #55. */
  updatedAt: string;
  /** Product status, resource #55. */
  status: "active" | "inactive" | "pending" | "archived";
  /** Product label, resource #55. */
  label: string;
  /** Product amountCents, resource #55. */
  amountCents: number;
  /** Product currency, resource #55. */
  currency: string;
  /** Product metadata, resource #55. */
  metadata: Record<string, string>;
  /** Product ownerId, resource #55. */
  ownerId: string;
  /** Product tags, resource #55. */
  tags: string[];
  /** Product notes, resource #55. */
  notes: string | null;
  /** Product version, resource #55. */
  version: number;
}

export interface ApiType0056 {
  /** Discount id, resource #56. */
  id: string;
  /** Discount createdAt, resource #56. */
  createdAt: string;
  /** Discount updatedAt, resource #56. */
  updatedAt: string;
  /** Discount status, resource #56. */
  status: "active" | "inactive" | "pending" | "archived";
  /** Discount label, resource #56. */
  label: string;
  /** Discount amountCents, resource #56. */
  amountCents: number;
  /** Discount currency, resource #56. */
  currency: string;
  /** Discount metadata, resource #56. */
  metadata: Record<string, string>;
  /** Discount ownerId, resource #56. */
  ownerId: string;
  /** Discount tags, resource #56. */
  tags: string[];
  /** Discount notes, resource #56. */
  notes: string | null;
  /** Discount version, resource #56. */
  version: number;
}

export interface ApiType0057 {
  /** Address id, resource #57. */
  id: string;
  /** Address createdAt, resource #57. */
  createdAt: string;
  /** Address updatedAt, resource #57. */
  updatedAt: string;
  /** Address status, resource #57. */
  status: "active" | "inactive" | "pending" | "archived";
  /** Address label, resource #57. */
  label: string;
  /** Address amountCents, resource #57. */
  amountCents: number;
  /** Address currency, resource #57. */
  currency: string;
  /** Address metadata, resource #57. */
  metadata: Record<string, string>;
  /** Address ownerId, resource #57. */
  ownerId: string;
  /** Address tags, resource #57. */
  tags: string[];
  /** Address notes, resource #57. */
  notes: string | null;
  /** Address version, resource #57. */
  version: number;
}

export interface ApiType0058 {
  /** Webhook id, resource #58. */
  id: string;
  /** Webhook createdAt, resource #58. */
  createdAt: string;
  /** Webhook updatedAt, resource #58. */
  updatedAt: string;
  /** Webhook status, resource #58. */
  status: "active" | "inactive" | "pending" | "archived";
  /** Webhook label, resource #58. */
  label: string;
  /** Webhook amountCents, resource #58. */
  amountCents: number;
  /** Webhook currency, resource #58. */
  currency: string;
  /** Webhook metadata, resource #58. */
  metadata: Record<string, string>;
  /** Webhook ownerId, resource #58. */
  ownerId: string;
  /** Webhook tags, resource #58. */
  tags: string[];
  /** Webhook notes, resource #58. */
  notes: string | null;
  /** Webhook version, resource #58. */
  version: number;
}

export interface ApiType0059 {
  /** ApiKey id, resource #59. */
  id: string;
  /** ApiKey createdAt, resource #59. */
  createdAt: string;
  /** ApiKey updatedAt, resource #59. */
  updatedAt: string;
  /** ApiKey status, resource #59. */
  status: "active" | "inactive" | "pending" | "archived";
  /** ApiKey label, resource #59. */
  label: string;
  /** ApiKey amountCents, resource #59. */
  amountCents: number;
  /** ApiKey currency, resource #59. */
  currency: string;
  /** ApiKey metadata, resource #59. */
  metadata: Record<string, string>;
  /** ApiKey ownerId, resource #59. */
  ownerId: string;
  /** ApiKey tags, resource #59. */
  tags: string[];
  /** ApiKey notes, resource #59. */
  notes: string | null;
  /** ApiKey version, resource #59. */
  version: number;
}

export interface ApiType0060 {
  /** AuditLog id, resource #60. */
  id: string;
  /** AuditLog createdAt, resource #60. */
  createdAt: string;
  /** AuditLog updatedAt, resource #60. */
  updatedAt: string;
  /** AuditLog status, resource #60. */
  status: "active" | "inactive" | "pending" | "archived";
  /** AuditLog label, resource #60. */
  label: string;
  /** AuditLog amountCents, resource #60. */
  amountCents: number;
  /** AuditLog currency, resource #60. */
  currency: string;
  /** AuditLog metadata, resource #60. */
  metadata: Record<string, string>;
  /** AuditLog ownerId, resource #60. */
  ownerId: string;
  /** AuditLog tags, resource #60. */
  tags: string[];
  /** AuditLog notes, resource #60. */
  notes: string | null;
  /** AuditLog version, resource #60. */
  version: number;
}

export interface ApiType0061 {
  /** Account id, resource #61. */
  id: string;
  /** Account createdAt, resource #61. */
  createdAt: string;
  /** Account updatedAt, resource #61. */
  updatedAt: string;
  /** Account status, resource #61. */
  status: "active" | "inactive" | "pending" | "archived";
  /** Account label, resource #61. */
  label: string;
  /** Account amountCents, resource #61. */
  amountCents: number;
  /** Account currency, resource #61. */
  currency: string;
  /** Account metadata, resource #61. */
  metadata: Record<string, string>;
  /** Account ownerId, resource #61. */
  ownerId: string;
  /** Account tags, resource #61. */
  tags: string[];
  /** Account notes, resource #61. */
  notes: string | null;
  /** Account version, resource #61. */
  version: number;
}

export interface ApiType0062 {
  /** Invoice id, resource #62. */
  id: string;
  /** Invoice createdAt, resource #62. */
  createdAt: string;
  /** Invoice updatedAt, resource #62. */
  updatedAt: string;
  /** Invoice status, resource #62. */
  status: "active" | "inactive" | "pending" | "archived";
  /** Invoice label, resource #62. */
  label: string;
  /** Invoice amountCents, resource #62. */
  amountCents: number;
  /** Invoice currency, resource #62. */
  currency: string;
  /** Invoice metadata, resource #62. */
  metadata: Record<string, string>;
  /** Invoice ownerId, resource #62. */
  ownerId: string;
  /** Invoice tags, resource #62. */
  tags: string[];
  /** Invoice notes, resource #62. */
  notes: string | null;
  /** Invoice version, resource #62. */
  version: number;
}

export interface ApiType0063 {
  /** Payment id, resource #63. */
  id: string;
  /** Payment createdAt, resource #63. */
  createdAt: string;
  /** Payment updatedAt, resource #63. */
  updatedAt: string;
  /** Payment status, resource #63. */
  status: "active" | "inactive" | "pending" | "archived";
  /** Payment label, resource #63. */
  label: string;
  /** Payment amountCents, resource #63. */
  amountCents: number;
  /** Payment currency, resource #63. */
  currency: string;
  /** Payment metadata, resource #63. */
  metadata: Record<string, string>;
  /** Payment ownerId, resource #63. */
  ownerId: string;
  /** Payment tags, resource #63. */
  tags: string[];
  /** Payment notes, resource #63. */
  notes: string | null;
  /** Payment version, resource #63. */
  version: number;
}

export interface ApiType0064 {
  /** Refund id, resource #64. */
  id: string;
  /** Refund createdAt, resource #64. */
  createdAt: string;
  /** Refund updatedAt, resource #64. */
  updatedAt: string;
  /** Refund status, resource #64. */
  status: "active" | "inactive" | "pending" | "archived";
  /** Refund label, resource #64. */
  label: string;
  /** Refund amountCents, resource #64. */
  amountCents: number;
  /** Refund currency, resource #64. */
  currency: string;
  /** Refund metadata, resource #64. */
  metadata: Record<string, string>;
  /** Refund ownerId, resource #64. */
  ownerId: string;
  /** Refund tags, resource #64. */
  tags: string[];
  /** Refund notes, resource #64. */
  notes: string | null;
  /** Refund version, resource #64. */
  version: number;
}

export interface ApiType0065 {
  /** Subscription id, resource #65. */
  id: string;
  /** Subscription createdAt, resource #65. */
  createdAt: string;
  /** Subscription updatedAt, resource #65. */
  updatedAt: string;
  /** Subscription status, resource #65. */
  status: "active" | "inactive" | "pending" | "archived";
  /** Subscription label, resource #65. */
  label: string;
  /** Subscription amountCents, resource #65. */
  amountCents: number;
  /** Subscription currency, resource #65. */
  currency: string;
  /** Subscription metadata, resource #65. */
  metadata: Record<string, string>;
  /** Subscription ownerId, resource #65. */
  ownerId: string;
  /** Subscription tags, resource #65. */
  tags: string[];
  /** Subscription notes, resource #65. */
  notes: string | null;
  /** Subscription version, resource #65. */
  version: number;
}

export interface ApiType0066 {
  /** Customer id, resource #66. */
  id: string;
  /** Customer createdAt, resource #66. */
  createdAt: string;
  /** Customer updatedAt, resource #66. */
  updatedAt: string;
  /** Customer status, resource #66. */
  status: "active" | "inactive" | "pending" | "archived";
  /** Customer label, resource #66. */
  label: string;
  /** Customer amountCents, resource #66. */
  amountCents: number;
  /** Customer currency, resource #66. */
  currency: string;
  /** Customer metadata, resource #66. */
  metadata: Record<string, string>;
  /** Customer ownerId, resource #66. */
  ownerId: string;
  /** Customer tags, resource #66. */
  tags: string[];
  /** Customer notes, resource #66. */
  notes: string | null;
  /** Customer version, resource #66. */
  version: number;
}

export interface ApiType0067 {
  /** Product id, resource #67. */
  id: string;
  /** Product createdAt, resource #67. */
  createdAt: string;
  /** Product updatedAt, resource #67. */
  updatedAt: string;
  /** Product status, resource #67. */
  status: "active" | "inactive" | "pending" | "archived";
  /** Product label, resource #67. */
  label: string;
  /** Product amountCents, resource #67. */
  amountCents: number;
  /** Product currency, resource #67. */
  currency: string;
  /** Product metadata, resource #67. */
  metadata: Record<string, string>;
  /** Product ownerId, resource #67. */
  ownerId: string;
  /** Product tags, resource #67. */
  tags: string[];
  /** Product notes, resource #67. */
  notes: string | null;
  /** Product version, resource #67. */
  version: number;
}

export interface ApiType0068 {
  /** Discount id, resource #68. */
  id: string;
  /** Discount createdAt, resource #68. */
  createdAt: string;
  /** Discount updatedAt, resource #68. */
  updatedAt: string;
  /** Discount status, resource #68. */
  status: "active" | "inactive" | "pending" | "archived";
  /** Discount label, resource #68. */
  label: string;
  /** Discount amountCents, resource #68. */
  amountCents: number;
  /** Discount currency, resource #68. */
  currency: string;
  /** Discount metadata, resource #68. */
  metadata: Record<string, string>;
  /** Discount ownerId, resource #68. */
  ownerId: string;
  /** Discount tags, resource #68. */
  tags: string[];
  /** Discount notes, resource #68. */
  notes: string | null;
  /** Discount version, resource #68. */
  version: number;
}

export interface ApiType0069 {
  /** Address id, resource #69. */
  id: string;
  /** Address createdAt, resource #69. */
  createdAt: string;
  /** Address updatedAt, resource #69. */
  updatedAt: string;
  /** Address status, resource #69. */
  status: "active" | "inactive" | "pending" | "archived";
  /** Address label, resource #69. */
  label: string;
  /** Address amountCents, resource #69. */
  amountCents: number;
  /** Address currency, resource #69. */
  currency: string;
  /** Address metadata, resource #69. */
  metadata: Record<string, string>;
  /** Address ownerId, resource #69. */
  ownerId: string;
  /** Address tags, resource #69. */
  tags: string[];
  /** Address notes, resource #69. */
  notes: string | null;
  /** Address version, resource #69. */
  version: number;
}

export interface ApiType0070 {
  /** Webhook id, resource #70. */
  id: string;
  /** Webhook createdAt, resource #70. */
  createdAt: string;
  /** Webhook updatedAt, resource #70. */
  updatedAt: string;
  /** Webhook status, resource #70. */
  status: "active" | "inactive" | "pending" | "archived";
  /** Webhook label, resource #70. */
  label: string;
  /** Webhook amountCents, resource #70. */
  amountCents: number;
  /** Webhook currency, resource #70. */
  currency: string;
  /** Webhook metadata, resource #70. */
  metadata: Record<string, string>;
  /** Webhook ownerId, resource #70. */
  ownerId: string;
  /** Webhook tags, resource #70. */
  tags: string[];
  /** Webhook notes, resource #70. */
  notes: string | null;
  /** Webhook version, resource #70. */
  version: number;
}

export interface ApiType0071 {
  /** ApiKey id, resource #71. */
  id: string;
  /** ApiKey createdAt, resource #71. */
  createdAt: string;
  /** ApiKey updatedAt, resource #71. */
  updatedAt: string;
  /** ApiKey status, resource #71. */
  status: "active" | "inactive" | "pending" | "archived";
  /** ApiKey label, resource #71. */
  label: string;
  /** ApiKey amountCents, resource #71. */
  amountCents: number;
  /** ApiKey currency, resource #71. */
  currency: string;
  /** ApiKey metadata, resource #71. */
  metadata: Record<string, string>;
  /** ApiKey ownerId, resource #71. */
  ownerId: string;
  /** ApiKey tags, resource #71. */
  tags: string[];
  /** ApiKey notes, resource #71. */
  notes: string | null;
  /** ApiKey version, resource #71. */
  version: number;
}

export interface ApiType0072 {
  /** AuditLog id, resource #72. */
  id: string;
  /** AuditLog createdAt, resource #72. */
  createdAt: string;
  /** AuditLog updatedAt, resource #72. */
  updatedAt: string;
  /** AuditLog status, resource #72. */
  status: "active" | "inactive" | "pending" | "archived";
  /** AuditLog label, resource #72. */
  label: string;
  /** AuditLog amountCents, resource #72. */
  amountCents: number;
  /** AuditLog currency, resource #72. */
  currency: string;
  /** AuditLog metadata, resource #72. */
  metadata: Record<string, string>;
  /** AuditLog ownerId, resource #72. */
  ownerId: string;
  /** AuditLog tags, resource #72. */
  tags: string[];
  /** AuditLog notes, resource #72. */
  notes: string | null;
  /** AuditLog version, resource #72. */
  version: number;
}

export interface ApiType0073 {
  /** Account id, resource #73. */
  id: string;
  /** Account createdAt, resource #73. */
  createdAt: string;
  /** Account updatedAt, resource #73. */
  updatedAt: string;
  /** Account status, resource #73. */
  status: "active" | "inactive" | "pending" | "archived";
  /** Account label, resource #73. */
  label: string;
  /** Account amountCents, resource #73. */
  amountCents: number;
  /** Account currency, resource #73. */
  currency: string;
  /** Account metadata, resource #73. */
  metadata: Record<string, string>;
  /** Account ownerId, resource #73. */
  ownerId: string;
  /** Account tags, resource #73. */
  tags: string[];
  /** Account notes, resource #73. */
  notes: string | null;
  /** Account version, resource #73. */
  version: number;
}

export interface ApiType0074 {
  /** Invoice id, resource #74. */
  id: string;
  /** Invoice createdAt, resource #74. */
  createdAt: string;
  /** Invoice updatedAt, resource #74. */
  updatedAt: string;
  /** Invoice status, resource #74. */
  status: "active" | "inactive" | "pending" | "archived";
  /** Invoice label, resource #74. */
  label: string;
  /** Invoice amountCents, resource #74. */
  amountCents: number;
  /** Invoice currency, resource #74. */
  currency: string;
  /** Invoice metadata, resource #74. */
  metadata: Record<string, string>;
  /** Invoice ownerId, resource #74. */
  ownerId: string;
  /** Invoice tags, resource #74. */
  tags: string[];
  /** Invoice notes, resource #74. */
  notes: string | null;
  /** Invoice version, resource #74. */
  version: number;
}

export interface ApiType0075 {
  /** Payment id, resource #75. */
  id: string;
  /** Payment createdAt, resource #75. */
  createdAt: string;
  /** Payment updatedAt, resource #75. */
  updatedAt: string;
  /** Payment status, resource #75. */
  status: "active" | "inactive" | "pending" | "archived";
  /** Payment label, resource #75. */
  label: string;
  /** Payment amountCents, resource #75. */
  amountCents: number;
  /** Payment currency, resource #75. */
  currency: string;
  /** Payment metadata, resource #75. */
  metadata: Record<string, string>;
  /** Payment ownerId, resource #75. */
  ownerId: string;
  /** Payment tags, resource #75. */
  tags: string[];
  /** Payment notes, resource #75. */
  notes: string | null;
  /** Payment version, resource #75. */
  version: number;
}

export interface ApiType0076 {
  /** Refund id, resource #76. */
  id: string;
  /** Refund createdAt, resource #76. */
  createdAt: string;
  /** Refund updatedAt, resource #76. */
  updatedAt: string;
  /** Refund status, resource #76. */
  status: "active" | "inactive" | "pending" | "archived";
  /** Refund label, resource #76. */
  label: string;
  /** Refund amountCents, resource #76. */
  amountCents: number;
  /** Refund currency, resource #76. */
  currency: string;
  /** Refund metadata, resource #76. */
  metadata: Record<string, string>;
  /** Refund ownerId, resource #76. */
  ownerId: string;
  /** Refund tags, resource #76. */
  tags: string[];
  /** Refund notes, resource #76. */
  notes: string | null;
  /** Refund version, resource #76. */
  version: number;
}

export interface ApiType0077 {
  /** Subscription id, resource #77. */
  id: string;
  /** Subscription createdAt, resource #77. */
  createdAt: string;
  /** Subscription updatedAt, resource #77. */
  updatedAt: string;
  /** Subscription status, resource #77. */
  status: "active" | "inactive" | "pending" | "archived";
  /** Subscription label, resource #77. */
  label: string;
  /** Subscription amountCents, resource #77. */
  amountCents: number;
  /** Subscription currency, resource #77. */
  currency: string;
  /** Subscription metadata, resource #77. */
  metadata: Record<string, string>;
  /** Subscription ownerId, resource #77. */
  ownerId: string;
  /** Subscription tags, resource #77. */
  tags: string[];
  /** Subscription notes, resource #77. */
  notes: string | null;
  /** Subscription version, resource #77. */
  version: number;
}

export interface ApiType0078 {
  /** Customer id, resource #78. */
  id: string;
  /** Customer createdAt, resource #78. */
  createdAt: string;
  /** Customer updatedAt, resource #78. */
  updatedAt: string;
  /** Customer status, resource #78. */
  status: "active" | "inactive" | "pending" | "archived";
  /** Customer label, resource #78. */
  label: string;
  /** Customer amountCents, resource #78. */
  amountCents: number;
  /** Customer currency, resource #78. */
  currency: string;
  /** Customer metadata, resource #78. */
  metadata: Record<string, string>;
  /** Customer ownerId, resource #78. */
  ownerId: string;
  /** Customer tags, resource #78. */
  tags: string[];
  /** Customer notes, resource #78. */
  notes: string | null;
  /** Customer version, resource #78. */
  version: number;
}

export interface ApiType0079 {
  /** Product id, resource #79. */
  id: string;
  /** Product createdAt, resource #79. */
  createdAt: string;
  /** Product updatedAt, resource #79. */
  updatedAt: string;
  /** Product status, resource #79. */
  status: "active" | "inactive" | "pending" | "archived";
  /** Product label, resource #79. */
  label: string;
  /** Product amountCents, resource #79. */
  amountCents: number;
  /** Product currency, resource #79. */
  currency: string;
  /** Product metadata, resource #79. */
  metadata: Record<string, string>;
  /** Product ownerId, resource #79. */
  ownerId: string;
  /** Product tags, resource #79. */
  tags: string[];
  /** Product notes, resource #79. */
  notes: string | null;
  /** Product version, resource #79. */
  version: number;
}

export interface ApiType0080 {
  /** Discount id, resource #80. */
  id: string;
  /** Discount createdAt, resource #80. */
  createdAt: string;
  /** Discount updatedAt, resource #80. */
  updatedAt: string;
  /** Discount status, resource #80. */
  status: "active" | "inactive" | "pending" | "archived";
  /** Discount label, resource #80. */
  label: string;
  /** Discount amountCents, resource #80. */
  amountCents: number;
  /** Discount currency, resource #80. */
  currency: string;
  /** Discount metadata, resource #80. */
  metadata: Record<string, string>;
  /** Discount ownerId, resource #80. */
  ownerId: string;
  /** Discount tags, resource #80. */
  tags: string[];
  /** Discount notes, resource #80. */
  notes: string | null;
  /** Discount version, resource #80. */
  version: number;
}

export interface ApiType0081 {
  /** Address id, resource #81. */
  id: string;
  /** Address createdAt, resource #81. */
  createdAt: string;
  /** Address updatedAt, resource #81. */
  updatedAt: string;
  /** Address status, resource #81. */
  status: "active" | "inactive" | "pending" | "archived";
  /** Address label, resource #81. */
  label: string;
  /** Address amountCents, resource #81. */
  amountCents: number;
  /** Address currency, resource #81. */
  currency: string;
  /** Address metadata, resource #81. */
  metadata: Record<string, string>;
  /** Address ownerId, resource #81. */
  ownerId: string;
  /** Address tags, resource #81. */
  tags: string[];
  /** Address notes, resource #81. */
  notes: string | null;
  /** Address version, resource #81. */
  version: number;
}

export interface ApiType0082 {
  /** Webhook id, resource #82. */
  id: string;
  /** Webhook createdAt, resource #82. */
  createdAt: string;
  /** Webhook updatedAt, resource #82. */
  updatedAt: string;
  /** Webhook status, resource #82. */
  status: "active" | "inactive" | "pending" | "archived";
  /** Webhook label, resource #82. */
  label: string;
  /** Webhook amountCents, resource #82. */
  amountCents: number;
  /** Webhook currency, resource #82. */
  currency: string;
  /** Webhook metadata, resource #82. */
  metadata: Record<string, string>;
  /** Webhook ownerId, resource #82. */
  ownerId: string;
  /** Webhook tags, resource #82. */
  tags: string[];
  /** Webhook notes, resource #82. */
  notes: string | null;
  /** Webhook version, resource #82. */
  version: number;
}

export interface ApiType0083 {
  /** ApiKey id, resource #83. */
  id: string;
  /** ApiKey createdAt, resource #83. */
  createdAt: string;
  /** ApiKey updatedAt, resource #83. */
  updatedAt: string;
  /** ApiKey status, resource #83. */
  status: "active" | "inactive" | "pending" | "archived";
  /** ApiKey label, resource #83. */
  label: string;
  /** ApiKey amountCents, resource #83. */
  amountCents: number;
  /** ApiKey currency, resource #83. */
  currency: string;
  /** ApiKey metadata, resource #83. */
  metadata: Record<string, string>;
  /** ApiKey ownerId, resource #83. */
  ownerId: string;
  /** ApiKey tags, resource #83. */
  tags: string[];
  /** ApiKey notes, resource #83. */
  notes: string | null;
  /** ApiKey version, resource #83. */
  version: number;
}

export interface ApiType0084 {
  /** AuditLog id, resource #84. */
  id: string;
  /** AuditLog createdAt, resource #84. */
  createdAt: string;
  /** AuditLog updatedAt, resource #84. */
  updatedAt: string;
  /** AuditLog status, resource #84. */
  status: "active" | "inactive" | "pending" | "archived";
  /** AuditLog label, resource #84. */
  label: string;
  /** AuditLog amountCents, resource #84. */
  amountCents: number;
  /** AuditLog currency, resource #84. */
  currency: string;
  /** AuditLog metadata, resource #84. */
  metadata: Record<string, string>;
  /** AuditLog ownerId, resource #84. */
  ownerId: string;
  /** AuditLog tags, resource #84. */
  tags: string[];
  /** AuditLog notes, resource #84. */
  notes: string | null;
  /** AuditLog version, resource #84. */
  version: number;
}

export interface ApiType0085 {
  /** Account id, resource #85. */
  id: string;
  /** Account createdAt, resource #85. */
  createdAt: string;
  /** Account updatedAt, resource #85. */
  updatedAt: string;
  /** Account status, resource #85. */
  status: "active" | "inactive" | "pending" | "archived";
  /** Account label, resource #85. */
  label: string;
  /** Account amountCents, resource #85. */
  amountCents: number;
  /** Account currency, resource #85. */
  currency: string;
  /** Account metadata, resource #85. */
  metadata: Record<string, string>;
  /** Account ownerId, resource #85. */
  ownerId: string;
  /** Account tags, resource #85. */
  tags: string[];
  /** Account notes, resource #85. */
  notes: string | null;
  /** Account version, resource #85. */
  version: number;
}

export interface ApiType0086 {
  /** Invoice id, resource #86. */
  id: string;
  /** Invoice createdAt, resource #86. */
  createdAt: string;
  /** Invoice updatedAt, resource #86. */
  updatedAt: string;
  /** Invoice status, resource #86. */
  status: "active" | "inactive" | "pending" | "archived";
  /** Invoice label, resource #86. */
  label: string;
  /** Invoice amountCents, resource #86. */
  amountCents: number;
  /** Invoice currency, resource #86. */
  currency: string;
  /** Invoice metadata, resource #86. */
  metadata: Record<string, string>;
  /** Invoice ownerId, resource #86. */
  ownerId: string;
  /** Invoice tags, resource #86. */
  tags: string[];
  /** Invoice notes, resource #86. */
  notes: string | null;
  /** Invoice version, resource #86. */
  version: number;
}

export interface ApiType0087 {
  /** Payment id, resource #87. */
  id: string;
  /** Payment createdAt, resource #87. */
  createdAt: string;
  /** Payment updatedAt, resource #87. */
  updatedAt: string;
  /** Payment status, resource #87. */
  status: "active" | "inactive" | "pending" | "archived";
  /** Payment label, resource #87. */
  label: string;
  /** Payment amountCents, resource #87. */
  amountCents: number;
  /** Payment currency, resource #87. */
  currency: string;
  /** Payment metadata, resource #87. */
  metadata: Record<string, string>;
  /** Payment ownerId, resource #87. */
  ownerId: string;
  /** Payment tags, resource #87. */
  tags: string[];
  /** Payment notes, resource #87. */
  notes: string | null;
  /** Payment version, resource #87. */
  version: number;
}

export interface ApiType0088 {
  /** Refund id, resource #88. */
  id: string;
  /** Refund createdAt, resource #88. */
  createdAt: string;
  /** Refund updatedAt, resource #88. */
  updatedAt: string;
  /** Refund status, resource #88. */
  status: "active" | "inactive" | "pending" | "archived";
  /** Refund label, resource #88. */
  label: string;
  /** Refund amountCents, resource #88. */
  amountCents: number;
  /** Refund currency, resource #88. */
  currency: string;
  /** Refund metadata, resource #88. */
  metadata: Record<string, string>;
  /** Refund ownerId, resource #88. */
  ownerId: string;
  /** Refund tags, resource #88. */
  tags: string[];
  /** Refund notes, resource #88. */
  notes: string | null;
  /** Refund version, resource #88. */
  version: number;
}

export interface ApiType0089 {
  /** Subscription id, resource #89. */
  id: string;
  /** Subscription createdAt, resource #89. */
  createdAt: string;
  /** Subscription updatedAt, resource #89. */
  updatedAt: string;
  /** Subscription status, resource #89. */
  status: "active" | "inactive" | "pending" | "archived";
  /** Subscription label, resource #89. */
  label: string;
  /** Subscription amountCents, resource #89. */
  amountCents: number;
  /** Subscription currency, resource #89. */
  currency: string;
  /** Subscription metadata, resource #89. */
  metadata: Record<string, string>;
  /** Subscription ownerId, resource #89. */
  ownerId: string;
  /** Subscription tags, resource #89. */
  tags: string[];
  /** Subscription notes, resource #89. */
  notes: string | null;
  /** Subscription version, resource #89. */
  version: number;
}

export interface ApiType0090 {
  /** Customer id, resource #90. */
  id: string;
  /** Customer createdAt, resource #90. */
  createdAt: string;
  /** Customer updatedAt, resource #90. */
  updatedAt: string;
  /** Customer status, resource #90. */
  status: "active" | "inactive" | "pending" | "archived";
  /** Customer label, resource #90. */
  label: string;
  /** Customer amountCents, resource #90. */
  amountCents: number;
  /** Customer currency, resource #90. */
  currency: string;
  /** Customer metadata, resource #90. */
  metadata: Record<string, string>;
  /** Customer ownerId, resource #90. */
  ownerId: string;
  /** Customer tags, resource #90. */
  tags: string[];
  /** Customer notes, resource #90. */
  notes: string | null;
  /** Customer version, resource #90. */
  version: number;
}

export interface ApiType0091 {
  /** Product id, resource #91. */
  id: string;
  /** Product createdAt, resource #91. */
  createdAt: string;
  /** Product updatedAt, resource #91. */
  updatedAt: string;
  /** Product status, resource #91. */
  status: "active" | "inactive" | "pending" | "archived";
  /** Product label, resource #91. */
  label: string;
  /** Product amountCents, resource #91. */
  amountCents: number;
  /** Product currency, resource #91. */
  currency: string;
  /** Product metadata, resource #91. */
  metadata: Record<string, string>;
  /** Product ownerId, resource #91. */
  ownerId: string;
  /** Product tags, resource #91. */
  tags: string[];
  /** Product notes, resource #91. */
  notes: string | null;
  /** Product version, resource #91. */
  version: number;
}

export interface ApiType0092 {
  /** Discount id, resource #92. */
  id: string;
  /** Discount createdAt, resource #92. */
  createdAt: string;
  /** Discount updatedAt, resource #92. */
  updatedAt: string;
  /** Discount status, resource #92. */
  status: "active" | "inactive" | "pending" | "archived";
  /** Discount label, resource #92. */
  label: string;
  /** Discount amountCents, resource #92. */
  amountCents: number;
  /** Discount currency, resource #92. */
  currency: string;
  /** Discount metadata, resource #92. */
  metadata: Record<string, string>;
  /** Discount ownerId, resource #92. */
  ownerId: string;
  /** Discount tags, resource #92. */
  tags: string[];
  /** Discount notes, resource #92. */
  notes: string | null;
  /** Discount version, resource #92. */
  version: number;
}

export interface ApiType0093 {
  /** Address id, resource #93. */
  id: string;
  /** Address createdAt, resource #93. */
  createdAt: string;
  /** Address updatedAt, resource #93. */
  updatedAt: string;
  /** Address status, resource #93. */
  status: "active" | "inactive" | "pending" | "archived";
  /** Address label, resource #93. */
  label: string;
  /** Address amountCents, resource #93. */
  amountCents: number;
  /** Address currency, resource #93. */
  currency: string;
  /** Address metadata, resource #93. */
  metadata: Record<string, string>;
  /** Address ownerId, resource #93. */
  ownerId: string;
  /** Address tags, resource #93. */
  tags: string[];
  /** Address notes, resource #93. */
  notes: string | null;
  /** Address version, resource #93. */
  version: number;
}

export interface ApiType0094 {
  /** Webhook id, resource #94. */
  id: string;
  /** Webhook createdAt, resource #94. */
  createdAt: string;
  /** Webhook updatedAt, resource #94. */
  updatedAt: string;
  /** Webhook status, resource #94. */
  status: "active" | "inactive" | "pending" | "archived";
  /** Webhook label, resource #94. */
  label: string;
  /** Webhook amountCents, resource #94. */
  amountCents: number;
  /** Webhook currency, resource #94. */
  currency: string;
  /** Webhook metadata, resource #94. */
  metadata: Record<string, string>;
  /** Webhook ownerId, resource #94. */
  ownerId: string;
  /** Webhook tags, resource #94. */
  tags: string[];
  /** Webhook notes, resource #94. */
  notes: string | null;
  /** Webhook version, resource #94. */
  version: number;
}

export interface ApiType0095 {
  /** ApiKey id, resource #95. */
  id: string;
  /** ApiKey createdAt, resource #95. */
  createdAt: string;
  /** ApiKey updatedAt, resource #95. */
  updatedAt: string;
  /** ApiKey status, resource #95. */
  status: "active" | "inactive" | "pending" | "archived";
  /** ApiKey label, resource #95. */
  label: string;
  /** ApiKey amountCents, resource #95. */
  amountCents: number;
  /** ApiKey currency, resource #95. */
  currency: string;
  /** ApiKey metadata, resource #95. */
  metadata: Record<string, string>;
  /** ApiKey ownerId, resource #95. */
  ownerId: string;
  /** ApiKey tags, resource #95. */
  tags: string[];
  /** ApiKey notes, resource #95. */
  notes: string | null;
  /** ApiKey version, resource #95. */
  version: number;
}

export interface ApiType0096 {
  /** AuditLog id, resource #96. */
  id: string;
  /** AuditLog createdAt, resource #96. */
  createdAt: string;
  /** AuditLog updatedAt, resource #96. */
  updatedAt: string;
  /** AuditLog status, resource #96. */
  status: "active" | "inactive" | "pending" | "archived";
  /** AuditLog label, resource #96. */
  label: string;
  /** AuditLog amountCents, resource #96. */
  amountCents: number;
  /** AuditLog currency, resource #96. */
  currency: string;
  /** AuditLog metadata, resource #96. */
  metadata: Record<string, string>;
  /** AuditLog ownerId, resource #96. */
  ownerId: string;
  /** AuditLog tags, resource #96. */
  tags: string[];
  /** AuditLog notes, resource #96. */
  notes: string | null;
  /** AuditLog version, resource #96. */
  version: number;
}

export interface ApiType0097 {
  /** Account id, resource #97. */
  id: string;
  /** Account createdAt, resource #97. */
  createdAt: string;
  /** Account updatedAt, resource #97. */
  updatedAt: string;
  /** Account status, resource #97. */
  status: "active" | "inactive" | "pending" | "archived";
  /** Account label, resource #97. */
  label: string;
  /** Account amountCents, resource #97. */
  amountCents: number;
  /** Account currency, resource #97. */
  currency: string;
  /** Account metadata, resource #97. */
  metadata: Record<string, string>;
  /** Account ownerId, resource #97. */
  ownerId: string;
  /** Account tags, resource #97. */
  tags: string[];
  /** Account notes, resource #97. */
  notes: string | null;
  /** Account version, resource #97. */
  version: number;
}

export interface ApiType0098 {
  /** Invoice id, resource #98. */
  id: string;
  /** Invoice createdAt, resource #98. */
  createdAt: string;
  /** Invoice updatedAt, resource #98. */
  updatedAt: string;
  /** Invoice status, resource #98. */
  status: "active" | "inactive" | "pending" | "archived";
  /** Invoice label, resource #98. */
  label: string;
  /** Invoice amountCents, resource #98. */
  amountCents: number;
  /** Invoice currency, resource #98. */
  currency: string;
  /** Invoice metadata, resource #98. */
  metadata: Record<string, string>;
  /** Invoice ownerId, resource #98. */
  ownerId: string;
  /** Invoice tags, resource #98. */
  tags: string[];
  /** Invoice notes, resource #98. */
  notes: string | null;
  /** Invoice version, resource #98. */
  version: number;
}

export interface ApiType0099 {
  /** Payment id, resource #99. */
  id: string;
  /** Payment createdAt, resource #99. */
  createdAt: string;
  /** Payment updatedAt, resource #99. */
  updatedAt: string;
  /** Payment status, resource #99. */
  status: "active" | "inactive" | "pending" | "archived";
  /** Payment label, resource #99. */
  label: string;
  /** Payment amountCents, resource #99. */
  amountCents: number;
  /** Payment currency, resource #99. */
  currency: string;
  /** Payment metadata, resource #99. */
  metadata: Record<string, string>;
  /** Payment ownerId, resource #99. */
  ownerId: string;
  /** Payment tags, resource #99. */
  tags: string[];
  /** Payment notes, resource #99. */
  notes: string | null;
  /** Payment version, resource #99. */
  version: number;
}

export interface ApiType0100 {
  /** Refund id, resource #100. */
  id: string;
  /** Refund createdAt, resource #100. */
  createdAt: string;
  /** Refund updatedAt, resource #100. */
  updatedAt: string;
  /** Refund status, resource #100. */
  status: "active" | "inactive" | "pending" | "archived";
  /** Refund label, resource #100. */
  label: string;
  /** Refund amountCents, resource #100. */
  amountCents: number;
  /** Refund currency, resource #100. */
  currency: string;
  /** Refund metadata, resource #100. */
  metadata: Record<string, string>;
  /** Refund ownerId, resource #100. */
  ownerId: string;
  /** Refund tags, resource #100. */
  tags: string[];
  /** Refund notes, resource #100. */
  notes: string | null;
  /** Refund version, resource #100. */
  version: number;
}

export interface ApiType0101 {
  /** Subscription id, resource #101. */
  id: string;
  /** Subscription createdAt, resource #101. */
  createdAt: string;
  /** Subscription updatedAt, resource #101. */
  updatedAt: string;
  /** Subscription status, resource #101. */
  status: "active" | "inactive" | "pending" | "archived";
  /** Subscription label, resource #101. */
  label: string;
  /** Subscription amountCents, resource #101. */
  amountCents: number;
  /** Subscription currency, resource #101. */
  currency: string;
  /** Subscription metadata, resource #101. */
  metadata: Record<string, string>;
  /** Subscription ownerId, resource #101. */
  ownerId: string;
  /** Subscription tags, resource #101. */
  tags: string[];
  /** Subscription notes, resource #101. */
  notes: string | null;
  /** Subscription version, resource #101. */
  version: number;
}

export interface ApiType0102 {
  /** Customer id, resource #102. */
  id: string;
  /** Customer createdAt, resource #102. */
  createdAt: string;
  /** Customer updatedAt, resource #102. */
  updatedAt: string;
  /** Customer status, resource #102. */
  status: "active" | "inactive" | "pending" | "archived";
  /** Customer label, resource #102. */
  label: string;
  /** Customer amountCents, resource #102. */
  amountCents: number;
  /** Customer currency, resource #102. */
  currency: string;
  /** Customer metadata, resource #102. */
  metadata: Record<string, string>;
  /** Customer ownerId, resource #102. */
  ownerId: string;
  /** Customer tags, resource #102. */
  tags: string[];
  /** Customer notes, resource #102. */
  notes: string | null;
  /** Customer version, resource #102. */
  version: number;
}

export interface ApiType0103 {
  /** Product id, resource #103. */
  id: string;
  /** Product createdAt, resource #103. */
  createdAt: string;
  /** Product updatedAt, resource #103. */
  updatedAt: string;
  /** Product status, resource #103. */
  status: "active" | "inactive" | "pending" | "archived";
  /** Product label, resource #103. */
  label: string;
  /** Product amountCents, resource #103. */
  amountCents: number;
  /** Product currency, resource #103. */
  currency: string;
  /** Product metadata, resource #103. */
  metadata: Record<string, string>;
  /** Product ownerId, resource #103. */
  ownerId: string;
  /** Product tags, resource #103. */
  tags: string[];
  /** Product notes, resource #103. */
  notes: string | null;
  /** Product version, resource #103. */
  version: number;
}

export interface ApiType0104 {
  /** Discount id, resource #104. */
  id: string;
  /** Discount createdAt, resource #104. */
  createdAt: string;
  /** Discount updatedAt, resource #104. */
  updatedAt: string;
  /** Discount status, resource #104. */
  status: "active" | "inactive" | "pending" | "archived";
  /** Discount label, resource #104. */
  label: string;
  /** Discount amountCents, resource #104. */
  amountCents: number;
  /** Discount currency, resource #104. */
  currency: string;
  /** Discount metadata, resource #104. */
  metadata: Record<string, string>;
  /** Discount ownerId, resource #104. */
  ownerId: string;
  /** Discount tags, resource #104. */
  tags: string[];
  /** Discount notes, resource #104. */
  notes: string | null;
  /** Discount version, resource #104. */
  version: number;
}

export interface ApiType0105 {
  /** Address id, resource #105. */
  id: string;
  /** Address createdAt, resource #105. */
  createdAt: string;
  /** Address updatedAt, resource #105. */
  updatedAt: string;
  /** Address status, resource #105. */
  status: "active" | "inactive" | "pending" | "archived";
  /** Address label, resource #105. */
  label: string;
  /** Address amountCents, resource #105. */
  amountCents: number;
  /** Address currency, resource #105. */
  currency: string;
  /** Address metadata, resource #105. */
  metadata: Record<string, string>;
  /** Address ownerId, resource #105. */
  ownerId: string;
  /** Address tags, resource #105. */
  tags: string[];
  /** Address notes, resource #105. */
  notes: string | null;
  /** Address version, resource #105. */
  version: number;
}

export interface ApiType0106 {
  /** Webhook id, resource #106. */
  id: string;
  /** Webhook createdAt, resource #106. */
  createdAt: string;
  /** Webhook updatedAt, resource #106. */
  updatedAt: string;
  /** Webhook status, resource #106. */
  status: "active" | "inactive" | "pending" | "archived";
  /** Webhook label, resource #106. */
  label: string;
  /** Webhook amountCents, resource #106. */
  amountCents: number;
  /** Webhook currency, resource #106. */
  currency: string;
  /** Webhook metadata, resource #106. */
  metadata: Record<string, string>;
  /** Webhook ownerId, resource #106. */
  ownerId: string;
  /** Webhook tags, resource #106. */
  tags: string[];
  /** Webhook notes, resource #106. */
  notes: string | null;
  /** Webhook version, resource #106. */
  version: number;
}

export interface ApiType0107 {
  /** ApiKey id, resource #107. */
  id: string;
  /** ApiKey createdAt, resource #107. */
  createdAt: string;
  /** ApiKey updatedAt, resource #107. */
  updatedAt: string;
  /** ApiKey status, resource #107. */
  status: "active" | "inactive" | "pending" | "archived";
  /** ApiKey label, resource #107. */
  label: string;
  /** ApiKey amountCents, resource #107. */
  amountCents: number;
  /** ApiKey currency, resource #107. */
  currency: string;
  /** ApiKey metadata, resource #107. */
  metadata: Record<string, string>;
  /** ApiKey ownerId, resource #107. */
  ownerId: string;
  /** ApiKey tags, resource #107. */
  tags: string[];
  /** ApiKey notes, resource #107. */
  notes: string | null;
  /** ApiKey version, resource #107. */
  version: number;
}

export interface ApiType0108 {
  /** AuditLog id, resource #108. */
  id: string;
  /** AuditLog createdAt, resource #108. */
  createdAt: string;
  /** AuditLog updatedAt, resource #108. */
  updatedAt: string;
  /** AuditLog status, resource #108. */
  status: "active" | "inactive" | "pending" | "archived";
  /** AuditLog label, resource #108. */
  label: string;
  /** AuditLog amountCents, resource #108. */
  amountCents: number;
  /** AuditLog currency, resource #108. */
  currency: string;
  /** AuditLog metadata, resource #108. */
  metadata: Record<string, string>;
  /** AuditLog ownerId, resource #108. */
  ownerId: string;
  /** AuditLog tags, resource #108. */
  tags: string[];
  /** AuditLog notes, resource #108. */
  notes: string | null;
  /** AuditLog version, resource #108. */
  version: number;
}

export interface ApiType0109 {
  /** Account id, resource #109. */
  id: string;
  /** Account createdAt, resource #109. */
  createdAt: string;
  /** Account updatedAt, resource #109. */
  updatedAt: string;
  /** Account status, resource #109. */
  status: "active" | "inactive" | "pending" | "archived";
  /** Account label, resource #109. */
  label: string;
  /** Account amountCents, resource #109. */
  amountCents: number;
  /** Account currency, resource #109. */
  currency: string;
  /** Account metadata, resource #109. */
  metadata: Record<string, string>;
  /** Account ownerId, resource #109. */
  ownerId: string;
  /** Account tags, resource #109. */
  tags: string[];
  /** Account notes, resource #109. */
  notes: string | null;
  /** Account version, resource #109. */
  version: number;
}

export interface ApiType0110 {
  /** Invoice id, resource #110. */
  id: string;
  /** Invoice createdAt, resource #110. */
  createdAt: string;
  /** Invoice updatedAt, resource #110. */
  updatedAt: string;
  /** Invoice status, resource #110. */
  status: "active" | "inactive" | "pending" | "archived";
  /** Invoice label, resource #110. */
  label: string;
  /** Invoice amountCents, resource #110. */
  amountCents: number;
  /** Invoice currency, resource #110. */
  currency: string;
  /** Invoice metadata, resource #110. */
  metadata: Record<string, string>;
  /** Invoice ownerId, resource #110. */
  ownerId: string;
  /** Invoice tags, resource #110. */
  tags: string[];
  /** Invoice notes, resource #110. */
  notes: string | null;
  /** Invoice version, resource #110. */
  version: number;
}

export interface ApiType0111 {
  /** Payment id, resource #111. */
  id: string;
  /** Payment createdAt, resource #111. */
  createdAt: string;
  /** Payment updatedAt, resource #111. */
  updatedAt: string;
  /** Payment status, resource #111. */
  status: "active" | "inactive" | "pending" | "archived";
  /** Payment label, resource #111. */
  label: string;
  /** Payment amountCents, resource #111. */
  amountCents: number;
  /** Payment currency, resource #111. */
  currency: string;
  /** Payment metadata, resource #111. */
  metadata: Record<string, string>;
  /** Payment ownerId, resource #111. */
  ownerId: string;
  /** Payment tags, resource #111. */
  tags: string[];
  /** Payment notes, resource #111. */
  notes: string | null;
  /** Payment version, resource #111. */
  version: number;
}

export interface ApiType0112 {
  /** Refund id, resource #112. */
  id: string;
  /** Refund createdAt, resource #112. */
  createdAt: string;
  /** Refund updatedAt, resource #112. */
  updatedAt: string;
  /** Refund status, resource #112. */
  status: "active" | "inactive" | "pending" | "archived";
  /** Refund label, resource #112. */
  label: string;
  /** Refund amountCents, resource #112. */
  amountCents: number;
  /** Refund currency, resource #112. */
  currency: string;
  /** Refund metadata, resource #112. */
  metadata: Record<string, string>;
  /** Refund ownerId, resource #112. */
  ownerId: string;
  /** Refund tags, resource #112. */
  tags: string[];
  /** Refund notes, resource #112. */
  notes: string | null;
  /** Refund version, resource #112. */
  version: number;
}

export interface ApiType0113 {
  /** Subscription id, resource #113. */
  id: string;
  /** Subscription createdAt, resource #113. */
  createdAt: string;
  /** Subscription updatedAt, resource #113. */
  updatedAt: string;
  /** Subscription status, resource #113. */
  status: "active" | "inactive" | "pending" | "archived";
  /** Subscription label, resource #113. */
  label: string;
  /** Subscription amountCents, resource #113. */
  amountCents: number;
  /** Subscription currency, resource #113. */
  currency: string;
  /** Subscription metadata, resource #113. */
  metadata: Record<string, string>;
  /** Subscription ownerId, resource #113. */
  ownerId: string;
  /** Subscription tags, resource #113. */
  tags: string[];
  /** Subscription notes, resource #113. */
  notes: string | null;
  /** Subscription version, resource #113. */
  version: number;
}

export interface ApiType0114 {
  /** Customer id, resource #114. */
  id: string;
  /** Customer createdAt, resource #114. */
  createdAt: string;
  /** Customer updatedAt, resource #114. */
  updatedAt: string;
  /** Customer status, resource #114. */
  status: "active" | "inactive" | "pending" | "archived";
  /** Customer label, resource #114. */
  label: string;
  /** Customer amountCents, resource #114. */
  amountCents: number;
  /** Customer currency, resource #114. */
  currency: string;
  /** Customer metadata, resource #114. */
  metadata: Record<string, string>;
  /** Customer ownerId, resource #114. */
  ownerId: string;
  /** Customer tags, resource #114. */
  tags: string[];
  /** Customer notes, resource #114. */
  notes: string | null;
  /** Customer version, resource #114. */
  version: number;
}

export interface ApiType0115 {
  /** Product id, resource #115. */
  id: string;
  /** Product createdAt, resource #115. */
  createdAt: string;
  /** Product updatedAt, resource #115. */
  updatedAt: string;
  /** Product status, resource #115. */
  status: "active" | "inactive" | "pending" | "archived";
  /** Product label, resource #115. */
  label: string;
  /** Product amountCents, resource #115. */
  amountCents: number;
  /** Product currency, resource #115. */
  currency: string;
  /** Product metadata, resource #115. */
  metadata: Record<string, string>;
  /** Product ownerId, resource #115. */
  ownerId: string;
  /** Product tags, resource #115. */
  tags: string[];
  /** Product notes, resource #115. */
  notes: string | null;
  /** Product version, resource #115. */
  version: number;
}

export interface ApiType0116 {
  /** Discount id, resource #116. */
  id: string;
  /** Discount createdAt, resource #116. */
  createdAt: string;
  /** Discount updatedAt, resource #116. */
  updatedAt: string;
  /** Discount status, resource #116. */
  status: "active" | "inactive" | "pending" | "archived";
  /** Discount label, resource #116. */
  label: string;
  /** Discount amountCents, resource #116. */
  amountCents: number;
  /** Discount currency, resource #116. */
  currency: string;
  /** Discount metadata, resource #116. */
  metadata: Record<string, string>;
  /** Discount ownerId, resource #116. */
  ownerId: string;
  /** Discount tags, resource #116. */
  tags: string[];
  /** Discount notes, resource #116. */
  notes: string | null;
  /** Discount version, resource #116. */
  version: number;
}

export interface ApiType0117 {
  /** Address id, resource #117. */
  id: string;
  /** Address createdAt, resource #117. */
  createdAt: string;
  /** Address updatedAt, resource #117. */
  updatedAt: string;
  /** Address status, resource #117. */
  status: "active" | "inactive" | "pending" | "archived";
  /** Address label, resource #117. */
  label: string;
  /** Address amountCents, resource #117. */
  amountCents: number;
  /** Address currency, resource #117. */
  currency: string;
  /** Address metadata, resource #117. */
  metadata: Record<string, string>;
  /** Address ownerId, resource #117. */
  ownerId: string;
  /** Address tags, resource #117. */
  tags: string[];
  /** Address notes, resource #117. */
  notes: string | null;
  /** Address version, resource #117. */
  version: number;
}

export interface ApiType0118 {
  /** Webhook id, resource #118. */
  id: string;
  /** Webhook createdAt, resource #118. */
  createdAt: string;
  /** Webhook updatedAt, resource #118. */
  updatedAt: string;
  /** Webhook status, resource #118. */
  status: "active" | "inactive" | "pending" | "archived";
  /** Webhook label, resource #118. */
  label: string;
  /** Webhook amountCents, resource #118. */
  amountCents: number;
  /** Webhook currency, resource #118. */
  currency: string;
  /** Webhook metadata, resource #118. */
  metadata: Record<string, string>;
  /** Webhook ownerId, resource #118. */
  ownerId: string;
  /** Webhook tags, resource #118. */
  tags: string[];
  /** Webhook notes, resource #118. */
  notes: string | null;
  /** Webhook version, resource #118. */
  version: number;
}

export interface ApiType0119 {
  /** ApiKey id, resource #119. */
  id: string;
  /** ApiKey createdAt, resource #119. */
  createdAt: string;
  /** ApiKey updatedAt, resource #119. */
  updatedAt: string;
  /** ApiKey status, resource #119. */
  status: "active" | "inactive" | "pending" | "archived";
  /** ApiKey label, resource #119. */
  label: string;
  /** ApiKey amountCents, resource #119. */
  amountCents: number;
  /** ApiKey currency, resource #119. */
  currency: string;
  /** ApiKey metadata, resource #119. */
  metadata: Record<string, string>;
  /** ApiKey ownerId, resource #119. */
  ownerId: string;
  /** ApiKey tags, resource #119. */
  tags: string[];
  /** ApiKey notes, resource #119. */
  notes: string | null;
  /** ApiKey version, resource #119. */
  version: number;
}

export interface ApiType0120 {
  /** AuditLog id, resource #120. */
  id: string;
  /** AuditLog createdAt, resource #120. */
  createdAt: string;
  /** AuditLog updatedAt, resource #120. */
  updatedAt: string;
  /** AuditLog status, resource #120. */
  status: "active" | "inactive" | "pending" | "archived";
  /** AuditLog label, resource #120. */
  label: string;
  /** AuditLog amountCents, resource #120. */
  amountCents: number;
  /** AuditLog currency, resource #120. */
  currency: string;
  /** AuditLog metadata, resource #120. */
  metadata: Record<string, string>;
  /** AuditLog ownerId, resource #120. */
  ownerId: string;
  /** AuditLog tags, resource #120. */
  tags: string[];
  /** AuditLog notes, resource #120. */
  notes: string | null;
  /** AuditLog version, resource #120. */
  version: number;
}

export interface ApiType0121 {
  /** Account id, resource #121. */
  id: string;
  /** Account createdAt, resource #121. */
  createdAt: string;
  /** Account updatedAt, resource #121. */
  updatedAt: string;
  /** Account status, resource #121. */
  status: "active" | "inactive" | "pending" | "archived";
  /** Account label, resource #121. */
  label: string;
  /** Account amountCents, resource #121. */
  amountCents: number;
  /** Account currency, resource #121. */
  currency: string;
  /** Account metadata, resource #121. */
  metadata: Record<string, string>;
  /** Account ownerId, resource #121. */
  ownerId: string;
  /** Account tags, resource #121. */
  tags: string[];
  /** Account notes, resource #121. */
  notes: string | null;
  /** Account version, resource #121. */
  version: number;
}

export interface ApiType0122 {
  /** Invoice id, resource #122. */
  id: string;
  /** Invoice createdAt, resource #122. */
  createdAt: string;
  /** Invoice updatedAt, resource #122. */
  updatedAt: string;
  /** Invoice status, resource #122. */
  status: "active" | "inactive" | "pending" | "archived";
  /** Invoice label, resource #122. */
  label: string;
  /** Invoice amountCents, resource #122. */
  amountCents: number;
  /** Invoice currency, resource #122. */
  currency: string;
  /** Invoice metadata, resource #122. */
  metadata: Record<string, string>;
  /** Invoice ownerId, resource #122. */
  ownerId: string;
  /** Invoice tags, resource #122. */
  tags: string[];
  /** Invoice notes, resource #122. */
  notes: string | null;
  /** Invoice version, resource #122. */
  version: number;
}

export interface ApiType0123 {
  /** Payment id, resource #123. */
  id: string;
  /** Payment createdAt, resource #123. */
  createdAt: string;
  /** Payment updatedAt, resource #123. */
  updatedAt: string;
  /** Payment status, resource #123. */
  status: "active" | "inactive" | "pending" | "archived";
  /** Payment label, resource #123. */
  label: string;
  /** Payment amountCents, resource #123. */
  amountCents: number;
  /** Payment currency, resource #123. */
  currency: string;
  /** Payment metadata, resource #123. */
  metadata: Record<string, string>;
  /** Payment ownerId, resource #123. */
  ownerId: string;
  /** Payment tags, resource #123. */
  tags: string[];
  /** Payment notes, resource #123. */
  notes: string | null;
  /** Payment version, resource #123. */
  version: number;
}

export interface ApiType0124 {
  /** Refund id, resource #124. */
  id: string;
  /** Refund createdAt, resource #124. */
  createdAt: string;
  /** Refund updatedAt, resource #124. */
  updatedAt: string;
  /** Refund status, resource #124. */
  status: "active" | "inactive" | "pending" | "archived";
  /** Refund label, resource #124. */
  label: string;
  /** Refund amountCents, resource #124. */
  amountCents: number;
  /** Refund currency, resource #124. */
  currency: string;
  /** Refund metadata, resource #124. */
  metadata: Record<string, string>;
  /** Refund ownerId, resource #124. */
  ownerId: string;
  /** Refund tags, resource #124. */
  tags: string[];
  /** Refund notes, resource #124. */
  notes: string | null;
  /** Refund version, resource #124. */
  version: number;
}

export interface ApiType0125 {
  /** Subscription id, resource #125. */
  id: string;
  /** Subscription createdAt, resource #125. */
  createdAt: string;
  /** Subscription updatedAt, resource #125. */
  updatedAt: string;
  /** Subscription status, resource #125. */
  status: "active" | "inactive" | "pending" | "archived";
  /** Subscription label, resource #125. */
  label: string;
  /** Subscription amountCents, resource #125. */
  amountCents: number;
  /** Subscription currency, resource #125. */
  currency: string;
  /** Subscription metadata, resource #125. */
  metadata: Record<string, string>;
  /** Subscription ownerId, resource #125. */
  ownerId: string;
  /** Subscription tags, resource #125. */
  tags: string[];
  /** Subscription notes, resource #125. */
  notes: string | null;
  /** Subscription version, resource #125. */
  version: number;
}

export interface ApiType0126 {
  /** Customer id, resource #126. */
  id: string;
  /** Customer createdAt, resource #126. */
  createdAt: string;
  /** Customer updatedAt, resource #126. */
  updatedAt: string;
  /** Customer status, resource #126. */
  status: "active" | "inactive" | "pending" | "archived";
  /** Customer label, resource #126. */
  label: string;
  /** Customer amountCents, resource #126. */
  amountCents: number;
  /** Customer currency, resource #126. */
  currency: string;
  /** Customer metadata, resource #126. */
  metadata: Record<string, string>;
  /** Customer ownerId, resource #126. */
  ownerId: string;
  /** Customer tags, resource #126. */
  tags: string[];
  /** Customer notes, resource #126. */
  notes: string | null;
  /** Customer version, resource #126. */
  version: number;
}

export interface ApiType0127 {
  /** Product id, resource #127. */
  id: string;
  /** Product createdAt, resource #127. */
  createdAt: string;
  /** Product updatedAt, resource #127. */
  updatedAt: string;
  /** Product status, resource #127. */
  status: "active" | "inactive" | "pending" | "archived";
  /** Product label, resource #127. */
  label: string;
  /** Product amountCents, resource #127. */
  amountCents: number;
  /** Product currency, resource #127. */
  currency: string;
  /** Product metadata, resource #127. */
  metadata: Record<string, string>;
  /** Product ownerId, resource #127. */
  ownerId: string;
  /** Product tags, resource #127. */
  tags: string[];
  /** Product notes, resource #127. */
  notes: string | null;
  /** Product version, resource #127. */
  version: number;
}

export interface ApiType0128 {
  /** Discount id, resource #128. */
  id: string;
  /** Discount createdAt, resource #128. */
  createdAt: string;
  /** Discount updatedAt, resource #128. */
  updatedAt: string;
  /** Discount status, resource #128. */
  status: "active" | "inactive" | "pending" | "archived";
  /** Discount label, resource #128. */
  label: string;
  /** Discount amountCents, resource #128. */
  amountCents: number;
  /** Discount currency, resource #128. */
  currency: string;
  /** Discount metadata, resource #128. */
  metadata: Record<string, string>;
  /** Discount ownerId, resource #128. */
  ownerId: string;
  /** Discount tags, resource #128. */
  tags: string[];
  /** Discount notes, resource #128. */
  notes: string | null;
  /** Discount version, resource #128. */
  version: number;
}

export interface ApiType0129 {
  /** Address id, resource #129. */
  id: string;
  /** Address createdAt, resource #129. */
  createdAt: string;
  /** Address updatedAt, resource #129. */
  updatedAt: string;
  /** Address status, resource #129. */
  status: "active" | "inactive" | "pending" | "archived";
  /** Address label, resource #129. */
  label: string;
  /** Address amountCents, resource #129. */
  amountCents: number;
  /** Address currency, resource #129. */
  currency: string;
  /** Address metadata, resource #129. */
  metadata: Record<string, string>;
  /** Address ownerId, resource #129. */
  ownerId: string;
  /** Address tags, resource #129. */
  tags: string[];
  /** Address notes, resource #129. */
  notes: string | null;
  /** Address version, resource #129. */
  version: number;
}

export interface ApiType0130 {
  /** Webhook id, resource #130. */
  id: string;
  /** Webhook createdAt, resource #130. */
  createdAt: string;
  /** Webhook updatedAt, resource #130. */
  updatedAt: string;
  /** Webhook status, resource #130. */
  status: "active" | "inactive" | "pending" | "archived";
  /** Webhook label, resource #130. */
  label: string;
  /** Webhook amountCents, resource #130. */
  amountCents: number;
  /** Webhook currency, resource #130. */
  currency: string;
  /** Webhook metadata, resource #130. */
  metadata: Record<string, string>;
  /** Webhook ownerId, resource #130. */
  ownerId: string;
  /** Webhook tags, resource #130. */
  tags: string[];
  /** Webhook notes, resource #130. */
  notes: string | null;
  /** Webhook version, resource #130. */
  version: number;
}

export interface ApiType0131 {
  /** ApiKey id, resource #131. */
  id: string;
  /** ApiKey createdAt, resource #131. */
  createdAt: string;
  /** ApiKey updatedAt, resource #131. */
  updatedAt: string;
  /** ApiKey status, resource #131. */
  status: "active" | "inactive" | "pending" | "archived";
  /** ApiKey label, resource #131. */
  label: string;
  /** ApiKey amountCents, resource #131. */
  amountCents: number;
  /** ApiKey currency, resource #131. */
  currency: string;
  /** ApiKey metadata, resource #131. */
  metadata: Record<string, string>;
  /** ApiKey ownerId, resource #131. */
  ownerId: string;
  /** ApiKey tags, resource #131. */
  tags: string[];
  /** ApiKey notes, resource #131. */
  notes: string | null;
  /** ApiKey version, resource #131. */
  version: number;
}

export interface ApiType0132 {
  /** AuditLog id, resource #132. */
  id: string;
  /** AuditLog createdAt, resource #132. */
  createdAt: string;
  /** AuditLog updatedAt, resource #132. */
  updatedAt: string;
  /** AuditLog status, resource #132. */
  status: "active" | "inactive" | "pending" | "archived";
  /** AuditLog label, resource #132. */
  label: string;
  /** AuditLog amountCents, resource #132. */
  amountCents: number;
  /** AuditLog currency, resource #132. */
  currency: string;
  /** AuditLog metadata, resource #132. */
  metadata: Record<string, string>;
  /** AuditLog ownerId, resource #132. */
  ownerId: string;
  /** AuditLog tags, resource #132. */
  tags: string[];
  /** AuditLog notes, resource #132. */
  notes: string | null;
  /** AuditLog version, resource #132. */
  version: number;
}

export interface ApiType0133 {
  /** Account id, resource #133. */
  id: string;
  /** Account createdAt, resource #133. */
  createdAt: string;
  /** Account updatedAt, resource #133. */
  updatedAt: string;
  /** Account status, resource #133. */
  status: "active" | "inactive" | "pending" | "archived";
  /** Account label, resource #133. */
  label: string;
  /** Account amountCents, resource #133. */
  amountCents: number;
  /** Account currency, resource #133. */
  currency: string;
  /** Account metadata, resource #133. */
  metadata: Record<string, string>;
  /** Account ownerId, resource #133. */
  ownerId: string;
  /** Account tags, resource #133. */
  tags: string[];
  /** Account notes, resource #133. */
  notes: string | null;
  /** Account version, resource #133. */
  version: number;
}

export interface ApiType0134 {
  /** Invoice id, resource #134. */
  id: string;
  /** Invoice createdAt, resource #134. */
  createdAt: string;
  /** Invoice updatedAt, resource #134. */
  updatedAt: string;
  /** Invoice status, resource #134. */
  status: "active" | "inactive" | "pending" | "archived";
  /** Invoice label, resource #134. */
  label: string;
  /** Invoice amountCents, resource #134. */
  amountCents: number;
  /** Invoice currency, resource #134. */
  currency: string;
  /** Invoice metadata, resource #134. */
  metadata: Record<string, string>;
  /** Invoice ownerId, resource #134. */
  ownerId: string;
  /** Invoice tags, resource #134. */
  tags: string[];
  /** Invoice notes, resource #134. */
  notes: string | null;
  /** Invoice version, resource #134. */
  version: number;
}

export interface ApiType0135 {
  /** Payment id, resource #135. */
  id: string;
  /** Payment createdAt, resource #135. */
  createdAt: string;
  /** Payment updatedAt, resource #135. */
  updatedAt: string;
  /** Payment status, resource #135. */
  status: "active" | "inactive" | "pending" | "archived";
  /** Payment label, resource #135. */
  label: string;
  /** Payment amountCents, resource #135. */
  amountCents: number;
  /** Payment currency, resource #135. */
  currency: string;
  /** Payment metadata, resource #135. */
  metadata: Record<string, string>;
  /** Payment ownerId, resource #135. */
  ownerId: string;
  /** Payment tags, resource #135. */
  tags: string[];
  /** Payment notes, resource #135. */
  notes: string | null;
  /** Payment version, resource #135. */
  version: number;
}

export interface ApiType0136 {
  /** Refund id, resource #136. */
  id: string;
  /** Refund createdAt, resource #136. */
  createdAt: string;
  /** Refund updatedAt, resource #136. */
  updatedAt: string;
  /** Refund status, resource #136. */
  status: "active" | "inactive" | "pending" | "archived";
  /** Refund label, resource #136. */
  label: string;
  /** Refund amountCents, resource #136. */
  amountCents: number;
  /** Refund currency, resource #136. */
  currency: string;
  /** Refund metadata, resource #136. */
  metadata: Record<string, string>;
  /** Refund ownerId, resource #136. */
  ownerId: string;
  /** Refund tags, resource #136. */
  tags: string[];
  /** Refund notes, resource #136. */
  notes: string | null;
  /** Refund version, resource #136. */
  version: number;
}

export interface ApiType0137 {
  /** Subscription id, resource #137. */
  id: string;
  /** Subscription createdAt, resource #137. */
  createdAt: string;
  /** Subscription updatedAt, resource #137. */
  updatedAt: string;
  /** Subscription status, resource #137. */
  status: "active" | "inactive" | "pending" | "archived";
  /** Subscription label, resource #137. */
  label: string;
  /** Subscription amountCents, resource #137. */
  amountCents: number;
  /** Subscription currency, resource #137. */
  currency: string;
  /** Subscription metadata, resource #137. */
  metadata: Record<string, string>;
  /** Subscription ownerId, resource #137. */
  ownerId: string;
  /** Subscription tags, resource #137. */
  tags: string[];
  /** Subscription notes, resource #137. */
  notes: string | null;
  /** Subscription version, resource #137. */
  version: number;
}

export interface ApiType0138 {
  /** Customer id, resource #138. */
  id: string;
  /** Customer createdAt, resource #138. */
  createdAt: string;
  /** Customer updatedAt, resource #138. */
  updatedAt: string;
  /** Customer status, resource #138. */
  status: "active" | "inactive" | "pending" | "archived";
  /** Customer label, resource #138. */
  label: string;
  /** Customer amountCents, resource #138. */
  amountCents: number;
  /** Customer currency, resource #138. */
  currency: string;
  /** Customer metadata, resource #138. */
  metadata: Record<string, string>;
  /** Customer ownerId, resource #138. */
  ownerId: string;
  /** Customer tags, resource #138. */
  tags: string[];
  /** Customer notes, resource #138. */
  notes: string | null;
  /** Customer version, resource #138. */
  version: number;
}

export interface ApiType0139 {
  /** Product id, resource #139. */
  id: string;
  /** Product createdAt, resource #139. */
  createdAt: string;
  /** Product updatedAt, resource #139. */
  updatedAt: string;
  /** Product status, resource #139. */
  status: "active" | "inactive" | "pending" | "archived";
  /** Product label, resource #139. */
  label: string;
  /** Product amountCents, resource #139. */
  amountCents: number;
  /** Product currency, resource #139. */
  currency: string;
  /** Product metadata, resource #139. */
  metadata: Record<string, string>;
  /** Product ownerId, resource #139. */
  ownerId: string;
  /** Product tags, resource #139. */
  tags: string[];
  /** Product notes, resource #139. */
  notes: string | null;
  /** Product version, resource #139. */
  version: number;
}

export interface ApiType0140 {
  /** Discount id, resource #140. */
  id: string;
  /** Discount createdAt, resource #140. */
  createdAt: string;
  /** Discount updatedAt, resource #140. */
  updatedAt: string;
  /** Discount status, resource #140. */
  status: "active" | "inactive" | "pending" | "archived";
  /** Discount label, resource #140. */
  label: string;
  /** Discount amountCents, resource #140. */
  amountCents: number;
  /** Discount currency, resource #140. */
  currency: string;
  /** Discount metadata, resource #140. */
  metadata: Record<string, string>;
  /** Discount ownerId, resource #140. */
  ownerId: string;
  /** Discount tags, resource #140. */
  tags: string[];
  /** Discount notes, resource #140. */
  notes: string | null;
  /** Discount version, resource #140. */
  version: number;
}

export interface ApiType0141 {
  /** Address id, resource #141. */
  id: string;
  /** Address createdAt, resource #141. */
  createdAt: string;
  /** Address updatedAt, resource #141. */
  updatedAt: string;
  /** Address status, resource #141. */
  status: "active" | "inactive" | "pending" | "archived";
  /** Address label, resource #141. */
  label: string;
  /** Address amountCents, resource #141. */
  amountCents: number;
  /** Address currency, resource #141. */
  currency: string;
  /** Address metadata, resource #141. */
  metadata: Record<string, string>;
  /** Address ownerId, resource #141. */
  ownerId: string;
  /** Address tags, resource #141. */
  tags: string[];
  /** Address notes, resource #141. */
  notes: string | null;
  /** Address version, resource #141. */
  version: number;
}

export interface ApiType0142 {
  /** Webhook id, resource #142. */
  id: string;
  /** Webhook createdAt, resource #142. */
  createdAt: string;
  /** Webhook updatedAt, resource #142. */
  updatedAt: string;
  /** Webhook status, resource #142. */
  status: "active" | "inactive" | "pending" | "archived";
  /** Webhook label, resource #142. */
  label: string;
  /** Webhook amountCents, resource #142. */
  amountCents: number;
  /** Webhook currency, resource #142. */
  currency: string;
  /** Webhook metadata, resource #142. */
  metadata: Record<string, string>;
  /** Webhook ownerId, resource #142. */
  ownerId: string;
  /** Webhook tags, resource #142. */
  tags: string[];
  /** Webhook notes, resource #142. */
  notes: string | null;
  /** Webhook version, resource #142. */
  version: number;
}

export interface ApiType0143 {
  /** ApiKey id, resource #143. */
  id: string;
  /** ApiKey createdAt, resource #143. */
  createdAt: string;
  /** ApiKey updatedAt, resource #143. */
  updatedAt: string;
  /** ApiKey status, resource #143. */
  status: "active" | "inactive" | "pending" | "archived";
  /** ApiKey label, resource #143. */
  label: string;
  /** ApiKey amountCents, resource #143. */
  amountCents: number;
  /** ApiKey currency, resource #143. */
  currency: string;
  /** ApiKey metadata, resource #143. */
  metadata: Record<string, string>;
  /** ApiKey ownerId, resource #143. */
  ownerId: string;
  /** ApiKey tags, resource #143. */
  tags: string[];
  /** ApiKey notes, resource #143. */
  notes: string | null;
  /** ApiKey version, resource #143. */
  version: number;
}

export interface ApiType0144 {
  /** AuditLog id, resource #144. */
  id: string;
  /** AuditLog createdAt, resource #144. */
  createdAt: string;
  /** AuditLog updatedAt, resource #144. */
  updatedAt: string;
  /** AuditLog status, resource #144. */
  status: "active" | "inactive" | "pending" | "archived";
  /** AuditLog label, resource #144. */
  label: string;
  /** AuditLog amountCents, resource #144. */
  amountCents: number;
  /** AuditLog currency, resource #144. */
  currency: string;
  /** AuditLog metadata, resource #144. */
  metadata: Record<string, string>;
  /** AuditLog ownerId, resource #144. */
  ownerId: string;
  /** AuditLog tags, resource #144. */
  tags: string[];
  /** AuditLog notes, resource #144. */
  notes: string | null;
  /** AuditLog version, resource #144. */
  version: number;
}

export interface ApiType0145 {
  /** Account id, resource #145. */
  id: string;
  /** Account createdAt, resource #145. */
  createdAt: string;
  /** Account updatedAt, resource #145. */
  updatedAt: string;
  /** Account status, resource #145. */
  status: "active" | "inactive" | "pending" | "archived";
  /** Account label, resource #145. */
  label: string;
  /** Account amountCents, resource #145. */
  amountCents: number;
  /** Account currency, resource #145. */
  currency: string;
  /** Account metadata, resource #145. */
  metadata: Record<string, string>;
  /** Account ownerId, resource #145. */
  ownerId: string;
  /** Account tags, resource #145. */
  tags: string[];
  /** Account notes, resource #145. */
  notes: string | null;
  /** Account version, resource #145. */
  version: number;
}

export interface ApiType0146 {
  /** Invoice id, resource #146. */
  id: string;
  /** Invoice createdAt, resource #146. */
  createdAt: string;
  /** Invoice updatedAt, resource #146. */
  updatedAt: string;
  /** Invoice status, resource #146. */
  status: "active" | "inactive" | "pending" | "archived";
  /** Invoice label, resource #146. */
  label: string;
  /** Invoice amountCents, resource #146. */
  amountCents: number;
  /** Invoice currency, resource #146. */
  currency: string;
  /** Invoice metadata, resource #146. */
  metadata: Record<string, string>;
  /** Invoice ownerId, resource #146. */
  ownerId: string;
  /** Invoice tags, resource #146. */
  tags: string[];
  /** Invoice notes, resource #146. */
  notes: string | null;
  /** Invoice version, resource #146. */
  version: number;
}

export interface ApiType0147 {
  /** Payment id, resource #147. */
  id: string;
  /** Payment createdAt, resource #147. */
  createdAt: string;
  /** Payment updatedAt, resource #147. */
  updatedAt: string;
  /** Payment status, resource #147. */
  status: "active" | "inactive" | "pending" | "archived";
  /** Payment label, resource #147. */
  label: string;
  /** Payment amountCents, resource #147. */
  amountCents: number;
  /** Payment currency, resource #147. */
  currency: string;
  /** Payment metadata, resource #147. */
  metadata: Record<string, string>;
  /** Payment ownerId, resource #147. */
  ownerId: string;
  /** Payment tags, resource #147. */
  tags: string[];
  /** Payment notes, resource #147. */
  notes: string | null;
  /** Payment version, resource #147. */
  version: number;
}

export interface ApiType0148 {
  /** Refund id, resource #148. */
  id: string;
  /** Refund createdAt, resource #148. */
  createdAt: string;
  /** Refund updatedAt, resource #148. */
  updatedAt: string;
  /** Refund status, resource #148. */
  status: "active" | "inactive" | "pending" | "archived";
  /** Refund label, resource #148. */
  label: string;
  /** Refund amountCents, resource #148. */
  amountCents: number;
  /** Refund currency, resource #148. */
  currency: string;
  /** Refund metadata, resource #148. */
  metadata: Record<string, string>;
  /** Refund ownerId, resource #148. */
  ownerId: string;
  /** Refund tags, resource #148. */
  tags: string[];
  /** Refund notes, resource #148. */
  notes: string | null;
  /** Refund version, resource #148. */
  version: number;
}

