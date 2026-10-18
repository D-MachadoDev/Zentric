import type {
  AddCartItemInput,
  AddStockInput,
  AdjustInventoryInput,
  AdjustInventoryResult,
  AnnulInvoiceInput,
  AuthToken,
  CancelGhostStockInput,
  CreateFulfillmentInput,
  CreateProductInput,
  CreateUserInput,
  CreateWarehouseInput,
  CreatedProduct,
  CurrentUser,
  FulfillmentOrder,
  FulfillmentStatus,
  HealthStatus,
  InspectReturnInput,
  Inventory,
  Invoice,
  ListProductsPagedParams,
  LoginInput,
  Order,
  OrderListItem,
  OrderStatus,
  PagedResult,
  Product,
  RequestReturnInput,
  ReturnRequest,
  ReturnStatus,
  SellerOrderView,
  User,
  UserProfile,
  UpdateUserProfileInput,
  UserRole,
  Warehouse,
  UpdateWarehouseInput,
  ZentricApiPort,
} from '../../domain';
import { ProblemDetailsError } from '../../domain';

/**
 * Adaptador simulado determinista de `ZentricApiPort` (Frontend-Adapters §4).
 *
 * Implementa en memoria las 45 operaciones del backend con estado reactivo,
 * permitiendo pruebas exhaustivas sin depender de red externa.
 */
export class MockZentricApiAdapter implements ZentricApiPort {
  healthStatus: HealthStatus = {
    status: 'healthy',
    database: 'up',
    timestamp: new Date().toISOString(),
  };

  users: User[] = [
    {
      id: '00000000-0000-0000-0000-000000000001',
      name: 'Admin Zentric',
      email: 'admin@zentric.test',
      role: 'Administrator' as UserRole,
      identityDocument: '100000001',
      isActive: true,
      createdAt: new Date().toISOString(),
    },
    {
      id: '00000000-0000-0000-0000-000000000002',
      name: 'Seller Uno',
      email: 'seller@zentric.test',
      role: 'Seller' as UserRole,
      identityDocument: '100000002',
      isActive: true,
      createdAt: new Date().toISOString(),
    },
    {
      id: '00000000-0000-0000-0000-000000000003',
      name: 'Buyer Uno',
      email: 'buyer@zentric.test',
      role: 'Buyer' as UserRole,
      identityDocument: '100000003',
      isActive: true,
      createdAt: new Date().toISOString(),
    },
  ];

  warehouses: Warehouse[] = [
    {
      id: '11111111-1111-1111-1111-111111111111',
      name: 'Bodega Central Zentric',
      location: 'Bogotá D.C., Colombia',
      capacity: 5000,
      type: 'Marketplace',
      vendorId: null,
      isActive: true,
      createdAt: new Date().toISOString(),
    },
  ];

  inventories: Inventory[] = [
    {
      id: '22222222-2222-2222-2222-222222222221',
      variantId: '33333333-3333-3333-3333-333333333331',
      warehouseId: '11111111-1111-1111-1111-111111111111',
      availableQuantity: 100,
      reservedQuantity: 10,
      usedQuantity: 0,
      damagedQuantity: 0,
    },
  ];

  products: Product[] = [
    {
      id: '44444444-4444-4444-4444-444444444441',
      name: 'Laptop Profesional',
      description: 'Portátil de alta gama para desarrollo',
      price: 1500,
      currency: 'USD',
      vendorId: '00000000-0000-0000-0000-000000000002',
      type: 'Physical',
      status: 'Published',
      variants: [
        {
          id: '33333333-3333-3333-3333-333333333331',
          sku: 'LAP-PRO-16-512',
          canBeSold: true,
        },
      ],
      createdAt: new Date().toISOString(),
    },
  ];

  orders: Order[] = [];
  fulfillments: FulfillmentOrder[] = [];
  returns: ReturnRequest[] = [];
  invoices: Invoice[] = [];

  currentUserData: CurrentUser = {
    userId: '00000000-0000-0000-0000-000000000001',
    email: 'admin@zentric.test',
    fullName: 'Admin Zentric',
    role: 'Administrator' as UserRole,
  };

  userProfile: UserProfile = {
    id: '00000000-0000-0000-0000-000000000003',
    email: 'buyer@zentric.test',
    fullName: 'Comprador Zentric',
    documentNumber: '1098765432',
    role: 'Buyer',
    phone: '+57 300 123 4567',
    address: {
      street: 'Carrera 7 # 156-68, Apto 904',
      city: 'Bogotá D.C.',
      state: 'Cundinamarca',
      zipCode: '110131',
      country: 'Colombia',
    },
  };

  // ── Sonda /health ────────────────────────────────────────────────────────
  async getHealth(): Promise<HealthStatus> {
    return { ...this.healthStatus };
  }

  // ── Auth ─────────────────────────────────────────────────────────────────
  async login(input: LoginInput): Promise<AuthToken> {
    const user = this.users.find((u) => u.email === input.email);
    if (!user || input.password === 'bad-password') {
      throw new ProblemDetailsError({
        status: 401,
        title: 'Credenciales inválidas',
        detail: 'Correo o contraseña incorrectos.',
      });
    }

    this.currentUserData = {
      userId: user.id,
      email: user.email,
      fullName: user.name,
      role: user.role,
    };

    return {
      token: `mock-jwt-token-for-${user.id}`,
      expiresAt: new Date(Date.now() + 3600_000).toISOString(),
      userId: user.id,
      email: user.email,
      fullName: user.name,
      role: user.role,
    };
  }

  async getCurrentUser(): Promise<CurrentUser> {
    return { ...this.currentUserData };
  }

  async currentUser(): Promise<CurrentUser> {
    return this.getCurrentUser();
  }

  // ── Users ────────────────────────────────────────────────────────────────
  async createUser(input: CreateUserInput): Promise<string> {
    const id = `user-${Date.now()}`;
    this.users.push({
      id,
      name: input.fullName,
      email: input.email,
      role: input.role,
      identityDocument: input.identityDocument,
      isActive: true,
      createdAt: new Date().toISOString(),
    });
    return id;
  }

  async listUsers(role?: UserRole): Promise<User[]> {
    return role ? this.users.filter((u) => u.role === role) : [...this.users];
  }

  async getUserById(id: string): Promise<User> {
    const user = this.users.find((u) => u.id === id);
    if (!user) {
      throw new ProblemDetailsError({
        status: 404,
        title: 'Usuario no encontrado',
        detail: `No se encontró el usuario con id ${id}.`,
      });
    }
    return { ...user };
  }

  async getUser(id: string): Promise<User> {
    return this.getUserById(id);
  }

  async blockUser(id: string): Promise<void> {
    const user = this.users.find((u) => u.id === id);
    if (!user) {
      throw new ProblemDetailsError({
        status: 404,
        title: 'Usuario no encontrado',
        detail: `No se encontró el usuario con id ${id}.`,
      });
    }
    user.isActive = false;
  }

  async activateUser(id: string): Promise<void> {
    const user = this.users.find((u) => u.id === id);
    if (!user) {
      throw new ProblemDetailsError({
        status: 404,
        title: 'Usuario no encontrado',
        detail: `No se encontró el usuario con id ${id}.`,
      });
    }
    user.isActive = true;
  }

  async getUserProfile(): Promise<UserProfile> {
    return { ...this.userProfile };
  }

  async updateUserProfile(input: UpdateUserProfileInput): Promise<UserProfile> {
    this.userProfile = {
      ...this.userProfile,
      fullName: input.fullName,
      phone: input.phone,
      documentNumber: input.documentNumber ?? this.userProfile.documentNumber,
      address: input.address ? { ...input.address } : this.userProfile.address,
    };
    return { ...this.userProfile };
  }

  // ── Warehouses ───────────────────────────────────────────────────────────
  async createWarehouse(input: CreateWarehouseInput): Promise<string> {
    const id = `wh-${Date.now()}`;
    this.warehouses.push({
      id,
      name: input.name,
      location: input.location,
      capacity: input.capacity,
      type: input.type,
      vendorId: input.vendorId,
      isActive: true,
      createdAt: new Date().toISOString(),
    });
    return id;
  }

  async listWarehouses(vendorId?: string): Promise<Warehouse[]> {
    return vendorId ? this.warehouses.filter((w) => w.vendorId === vendorId) : [...this.warehouses];
  }

  async getWarehouseById(id: string): Promise<Warehouse> {
    const wh = this.warehouses.find((w) => w.id === id);
    if (!wh) {
      throw new ProblemDetailsError({
        status: 404,
        title: 'Bodega no encontrada',
        detail: `No se encontró la bodega ${id}.`,
      });
    }
    return { ...wh };
  }

  async updateWarehouse(id: string, input: UpdateWarehouseInput): Promise<void> {
    const wh = this.warehouses.find((w) => w.id === id);
    if (!wh) {
      throw new ProblemDetailsError({
        status: 404,
        title: 'Bodega no encontrada',
        detail: `No se encontró la bodega ${id}.`,
      });
    }
    if (input.name !== undefined) wh.name = input.name;
    if (input.location !== undefined) wh.location = input.location;
    if (input.capacity !== undefined) wh.capacity = input.capacity;
    if (input.isActive !== undefined) wh.isActive = input.isActive;
  }

  // ── Inventories ──────────────────────────────────────────────────────────
  async addStock(input: AddStockInput): Promise<string> {
    const existing = this.inventories.find(
      (i) => i.variantId === input.variantId && i.warehouseId === input.warehouseId,
    );
    if (existing) {
      existing.availableQuantity += input.quantity;
      return existing.id;
    }
    const id = `inv-${Date.now()}`;
    this.inventories.push({
      id,
      variantId: input.variantId,
      warehouseId: input.warehouseId,
      availableQuantity: input.quantity,
      reservedQuantity: 0,
      usedQuantity: 0,
      damagedQuantity: 0,
    });
    return id;
  }

  async listInventories(): Promise<Inventory[]> {
    return [...this.inventories];
  }

  async listInventoryByVariant(variantId: string): Promise<Inventory[]> {
    return this.inventories.filter((i) => i.variantId === variantId);
  }

  async adjustInventory(id: string, input: AdjustInventoryInput): Promise<AdjustInventoryResult> {
    const inv = this.inventories.find((i) => i.id === id);
    if (!inv) {
      throw new ProblemDetailsError({
        status: 404,
        title: 'Inventario no encontrado',
        detail: 'Registro de inventario inexistente.',
      });
    }
    const previous = inv.availableQuantity;
    inv.availableQuantity = input.countedQuantity;
    return {
      adjustmentId: `adj-${Date.now()}`,
      inventoryId: id,
      previousAvailableQuantity: previous,
      newAvailableQuantity: input.countedQuantity,
      adjustedQuantity: input.countedQuantity - previous,
      reason: input.reason,
      countedAt: new Date().toISOString(),
    };
  }

  // ── Catalog ──────────────────────────────────────────────────────────────
  async createProduct(input: CreateProductInput): Promise<CreatedProduct> {
    const productId = `prod-${Date.now()}`;
    const variantIds = (input.variants ?? []).map((_, idx) => `var-${Date.now()}-${idx}`);
    this.products.push({
      id: productId,
      name: input.name,
      description: input.description,
      price: input.priceAmount,
      currency: input.priceCurrency,
      vendorId: this.currentUserData.userId,
      type: input.type,
      status: 'Published',
      variants: (input.variants ?? []).map((v, i) => ({
        id: variantIds[i] ?? `var-${i}`,
        sku: v.sku,
        canBeSold: true,
      })),
      createdAt: new Date().toISOString(),
    });
    return { productId, variantIds };
  }

  async publishProduct(productId: string): Promise<void> {
    const product = await this.getProductById(productId);
    product.status = 'Published';
  }

  async suspendProduct(productId: string): Promise<void> {
    const product = await this.getProductById(productId);
    product.status = 'Suspended';
  }

  async listProducts(vendorId?: string): Promise<Product[]> {
    return vendorId ? this.products.filter((p) => p.vendorId === vendorId) : [...this.products];
  }

  async listProductsPaged(params?: ListProductsPagedParams): Promise<PagedResult<Product>> {
    const page = params?.page ?? 0;
    const size = params?.size ?? 10;
    let filtered = params?.vendorId
      ? this.products.filter((p) => p.vendorId === params.vendorId)
      : this.products;
    if (params?.category && params.category !== 'all') {
      const cat = params.category.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          (p.category && p.category.toLowerCase() === cat) ||
          p.name.toLowerCase().includes(cat) ||
          (p.description && p.description.toLowerCase().includes(cat)),
      );
    }
    const start = page * size;
    const items = filtered.slice(start, start + size);
    return {
      items,
      page,
      size,
      totalItems: filtered.length,
      totalPages: Math.ceil(filtered.length / size) || 1,
      hasPrevious: page > 0,
      hasNext: start + size < filtered.length,
    };
  }

  async getProductById(id: string): Promise<Product> {
    const prod = this.products.find((p) => p.id === id);
    if (!prod) {
      throw new ProblemDetailsError({
        status: 404,
        title: 'Producto no encontrado',
        detail: `No se encontró el producto ${id}.`,
      });
    }
    return { ...prod };
  }

  async getProduct(id: string): Promise<Product> {
    return this.getProductById(id);
  }

  // ── Orders ───────────────────────────────────────────────────────────────
  async createCart(): Promise<string> {
    const id = `order-${Date.now()}`;
    this.orders.push({
      id,
      buyerId: this.currentUserData.userId,
      status: 'Cart',
      totalAmount: 0,
      currency: 'COP',
      items: [],
      createdAt: new Date().toISOString(),
    });
    return id;
  }

  async addCartItem(input: AddCartItemInput): Promise<void> {
    const order = this.orders.find((o) => o.id === input.orderId);
    if (!order) throw new ProblemDetailsError({ status: 404, detail: 'Pedido no encontrado' });
    order.items.push({
      id: `item-${Date.now()}`,
      variantId: input.variantId,
      quantity: input.quantity,
      unitPrice: 100,
      totalPrice: 100 * input.quantity,
    });
    order.totalAmount += 100 * input.quantity;
  }

  async checkoutOrder(orderId: string): Promise<void> {
    const order = this.orders.find((o) => o.id === orderId);
    if (!order) throw new ProblemDetailsError({ status: 404, detail: 'Pedido no encontrado' });
    order.status = 'PendingPayment';
  }

  async payOrder(orderId: string): Promise<void> {
    const order = this.orders.find((o) => o.id === orderId);
    if (!order) throw new ProblemDetailsError({ status: 404, detail: 'Pedido no encontrado' });
    order.status = 'Paid';
  }

  async listOrders(status?: OrderStatus | string): Promise<OrderListItem[]> {
    return this.orders
      .filter((o) => !status || o.status === status)
      .map((o) => ({
        id: o.id,
        status: o.status,
        currency: o.currency,
        totalAmount: o.totalAmount,
        items: o.items,
        itemCount: o.items.length,
        buyerId: o.buyerId,
        createdAt: o.createdAt,
      }));
  }

  async getOrderById(id: string): Promise<Order | SellerOrderView> {
    const order = this.orders.find((o) => o.id === id);
    if (!order) throw new ProblemDetailsError({ status: 404, detail: 'Pedido no encontrado' });
    return { ...order };
  }

  async getOrder(id: string): Promise<Order | SellerOrderView> {
    return this.getOrderById(id);
  }

  // ── Logistics ────────────────────────────────────────────────────────────
  async createFulfillment(input: CreateFulfillmentInput): Promise<string> {
    const id = `ful-${Date.now()}`;
    this.fulfillments.push({
      id,
      customerOrderId: input.customerOrderId,
      vendorId: input.vendorId,
      status: 'PendingPack',
      cancellationReason: null,
      shipments: [],
      createdAt: new Date().toISOString(),
    });
    return id;
  }

  async packFulfillment(id: string): Promise<void> {
    const ful = this.fulfillments.find((f) => f.id === id);
    if (!ful) throw new ProblemDetailsError({ status: 404, detail: 'Despacho no encontrado' });
    ful.status = 'Packed';
  }

  async dispatchFulfillment(id: string): Promise<void> {
    const ful = this.fulfillments.find((f) => f.id === id);
    if (!ful) throw new ProblemDetailsError({ status: 404, detail: 'Despacho no encontrado' });
    ful.status = 'Dispatched';
  }

  async deliverFulfillment(id: string): Promise<void> {
    const ful = this.fulfillments.find((f) => f.id === id);
    if (!ful) throw new ProblemDetailsError({ status: 404, detail: 'Despacho no encontrado' });
    ful.status = 'Delivered';
  }

  async cancelGhostStock(input: CancelGhostStockInput): Promise<boolean> {
    const ful = this.fulfillments.find((f) => f.id === input.fulfillmentOrderId);
    if (ful) {
      ful.status = 'Cancelled';
      ful.cancellationReason = 'Quiebre de stock fantasma';
    }
    return true;
  }

  async listFulfillments(status?: FulfillmentStatus | string): Promise<FulfillmentOrder[]> {
    return status ? this.fulfillments.filter((f) => f.status === status) : [...this.fulfillments];
  }

  async getFulfillmentById(id: string): Promise<FulfillmentOrder> {
    const ful = this.fulfillments.find((f) => f.id === id);
    if (!ful) throw new ProblemDetailsError({ status: 404, detail: 'Despacho no encontrado' });
    return { ...ful };
  }

  async getFulfillment(id: string): Promise<FulfillmentOrder> {
    return this.getFulfillmentById(id);
  }

  // ── Returns ──────────────────────────────────────────────────────────────
  async requestReturn(input: RequestReturnInput): Promise<string> {
    const id = `ret-${Date.now()}`;
    this.returns.push({
      id,
      customerOrderId: input.customerOrderId,
      variantId: input.variantId,
      warehouseId: input.warehouseId,
      quantity: input.quantity,
      status: 'Requested',
      isGoodCondition: false,
      vendorApproved: false,
      createdAt: new Date().toISOString(),
    });
    return id;
  }

  async inspectReturn(id: string, input: InspectReturnInput): Promise<void> {
    const ret = this.returns.find((r) => r.id === id);
    if (!ret) throw new ProblemDetailsError({ status: 404, detail: 'Devolución no encontrada' });
    ret.isGoodCondition = input.isGoodCondition;
  }

  async approveReturn(id: string): Promise<void> {
    const ret = this.returns.find((r) => r.id === id);
    if (!ret) throw new ProblemDetailsError({ status: 404, detail: 'Devolución no encontrada' });
    ret.status = 'Approved';
    ret.vendorApproved = true;
  }

  async rejectReturn(id: string): Promise<void> {
    const ret = this.returns.find((r) => r.id === id);
    if (!ret) throw new ProblemDetailsError({ status: 404, detail: 'Devolución no encontrada' });
    ret.status = 'Rejected';
  }

  async refundReturn(id: string): Promise<void> {
    const ret = this.returns.find((r) => r.id === id);
    if (!ret) throw new ProblemDetailsError({ status: 404, detail: 'Devolución no encontrada' });
    ret.status = 'Refunded' as ReturnStatus;
  }

  async listReturns(status?: ReturnStatus | string): Promise<ReturnRequest[]> {
    return status ? this.returns.filter((r) => r.status === status) : [...this.returns];
  }

  async getReturnById(id: string): Promise<ReturnRequest> {
    const ret = this.returns.find((r) => r.id === id);
    if (!ret) throw new ProblemDetailsError({ status: 404, detail: 'Devolución no encontrada' });
    return { ...ret };
  }

  async getReturn(id: string): Promise<ReturnRequest> {
    return this.getReturnById(id);
  }

  // ── Billing ──────────────────────────────────────────────────────────────
  async generateInvoices(orderId: string): Promise<boolean> {
    this.invoices.push({
      id: `inv-${Date.now()}-master`,
      customerOrderId: orderId,
      vendorId: null,
      type: 'Master',
      totalAmount: 200,
      currency: 'COP',
      issuedAt: new Date().toISOString(),
    });
    return true;
  }

  async annulInvoices(orderId: string, _input: AnnulInvoiceInput): Promise<void> {
    const found = this.invoices.filter((i) => i.customerOrderId === orderId);
    if (found.length === 0) {
      throw new ProblemDetailsError({ status: 404, detail: 'Facturas no encontradas para el pedido' });
    }
  }

  async listInvoices(): Promise<Invoice[]> {
    return [...this.invoices];
  }

  async getInvoicesByOrder(orderId: string): Promise<Invoice[]> {
    return this.invoices.filter((i) => i.customerOrderId === orderId);
  }
}
