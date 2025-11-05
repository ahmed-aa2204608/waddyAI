'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Save, AlertCircle, Trash2, Plus, Minus, Search, X, Check, ChevronsUpDown, ChevronDownIcon, CalendarIcon } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { useApi } from '@/hooks/useApi';

// Helper function to format date
const formatDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return `${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`;
};

// Helper function to format time
const formatTime = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
};

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.orderId;
  
  const [order, setOrder] = useState(null);
  const [orderItems, setOrderItems] = useState([]);
  const [inboxItem, setInboxItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [catalogProducts, setCatalogProducts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [saving, setSaving] = useState(false);
  const [openPopovers, setOpenPopovers] = useState({});
  const [deliveryDateOpen, setDeliveryDateOpen] = useState(false);
  const [deliveryInstructions, setDeliveryInstructions] = useState('');
  const [debounceTimer, setDebounceTimer] = useState(null);

  // Fetch order, order items, and inbox item
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch order
        const orderResponse = await fetch(`https://wadyai.onrender.com/api/v1/orders/${orderId}`);
        if (!orderResponse.ok) {
          throw new Error('Failed to fetch order');
        }
        const orderData = await orderResponse.json();
        setOrder(orderData);
        setDeliveryInstructions(orderData.delivery_instructions || '');

        // Update order status to "reviewing" (uploading pending) when page is opened
        if (orderData.order_status !== 'reviewing' && orderData.order_status !== 'reviewed') {
          try {
            const statusResponse = await fetch(
              `https://wadyai.onrender.com/api/v1/orders/${orderId}/status`,
              {
                method: 'PUT',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  order_status: 'reviewing',
                }),
              }
            );
            
            if (statusResponse.ok) {
              setOrder(prev => ({ ...prev, order_status: 'reviewing' }));
            }
          } catch (err) {
            console.error('Failed to update order status:', err);
          }
        }

        // Fetch order items
        const itemsResponse = await fetch(`https://wadyai.onrender.com/api/v1/order-items/order/${orderId}`);
        if (itemsResponse.ok) {
          const items = await itemsResponse.json();
          setOrderItems(items);
        }

        // Fetch inbox item for customer info and email content
        if (orderData.inbox_item_id) {
          const inboxResponse = await fetch(`https://wadyai.onrender.com/api/v1/inbox/items/${orderData.inbox_item_id}`);
          if (inboxResponse.ok) {
            const inbox = await inboxResponse.json();
            setInboxItem(inbox);
          }
        }

        // Fetch catalog products
        const catalogResponse = await fetch('https://wadyai.onrender.com/api/v1/catalog/products?limit=100');
        if (catalogResponse.ok) {
          const products = await catalogResponse.json();
          setCatalogProducts(products);
        }
      } catch (err) {
        console.error('Failed to fetch order details:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [orderId]);

  // Handle product selection
  const handleProductChange = (itemIndex, productId) => {
    const product = catalogProducts.find(p => p.product_id === productId);
    if (product) {
      const updatedItems = [...orderItems];
      if (itemIndex < updatedItems.length) {
        // Update existing item
        updatedItems[itemIndex] = {
          ...updatedItems[itemIndex],
          product_name: product.product_name,
          product_id: product.product_id,
          sku: product.sku,
          unit: product.unit,
        };
      } else {
        // Add new item
        updatedItems.push({
          product_name: product.product_name,
          product_id: product.product_id,
          sku: product.sku,
          unit: product.unit,
          quantity: 1,
        });
      }
      setOrderItems(updatedItems);
      setOpenPopovers({ ...openPopovers, [itemIndex]: false });
    }
  };

  // Toggle popover
  const togglePopover = (index, isOpen) => {
    setOpenPopovers({ ...openPopovers, [index]: isOpen });
  };

  // Add new empty item
  const handleAddItem = () => {
    const newItem = {
      product_name: '',
      product_id: null,
      sku: '',
      unit: 'each',
      quantity: 1,
    };
    setOrderItems([...orderItems, newItem]);
  };

  // Handle quantity change
  const handleQuantityChange = (itemIndex, newQuantity) => {
    const updatedItems = [...orderItems];
    const quantity = parseInt(newQuantity) || 0;
    updatedItems[itemIndex] = {
      ...updatedItems[itemIndex],
      quantity: quantity,
    };
    setOrderItems(updatedItems);
  };

  // Increment quantity
  const handleIncrementQuantity = (itemIndex) => {
    const updatedItems = [...orderItems];
    updatedItems[itemIndex] = {
      ...updatedItems[itemIndex],
      quantity: (updatedItems[itemIndex].quantity || 0) + 1,
    };
    setOrderItems(updatedItems);
  };

  // Decrement quantity
  const handleDecrementQuantity = (itemIndex) => {
    const updatedItems = [...orderItems];
    const currentQty = updatedItems[itemIndex].quantity || 0;
    if (currentQty > 0) {
      updatedItems[itemIndex] = {
        ...updatedItems[itemIndex],
        quantity: currentQty - 1,
      };
      setOrderItems(updatedItems);
    }
  };

  // Update delivery instructions with debouncing
  const handleDeliveryInstructionsChange = (newInstructions) => {
    // Update local state immediately for responsive UI
    setDeliveryInstructions(newInstructions);
    
    // Clear existing timer
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }
    
    // Set new timer to call API after 500ms of no typing
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(
          `https://wadyai.onrender.com/api/v1/orders/${orderId}/delivery-instructions`,
          {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              delivery_instructions: newInstructions,
            }),
          }
        );

        if (!response.ok) {
          throw new Error('Failed to update delivery instructions');
        }

        // Update order state
        setOrder({ ...order, delivery_instructions: newInstructions });
      } catch (err) {
        console.error('Failed to update delivery instructions:', err);
        alert(`Failed to update delivery instructions: ${err.message}`);
      }
    }, 500);
    
    setDebounceTimer(timer);
  };

  // Update delivery date
  const handleDeliveryDateChange = async (selectedDate) => {
    try {
      // Format date as YYYY-MM-DD
      const formattedDate = selectedDate ? selectedDate.toISOString().split('T')[0] : null;
      
      const response = await fetch(
        `https://wadyai.onrender.com/api/v1/orders/${orderId}/delivery-date`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            delivery_date: formattedDate,
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to update delivery date');
      }

      // Update local state
      setOrder({ ...order, delivery_date: formattedDate });
      setDeliveryDateOpen(false);
    } catch (err) {
      console.error('Failed to update delivery date:', err);
      alert(`Failed to update delivery date: ${err.message}`);
    }
  };

  // Save order items
  const handleSave = async () => {
    try {
      setSaving(true);
      
      // Get all product IDs from order items
      const productIds = orderItems
        .filter(item => item.product_id) // Only include items with product_id
        .map(item => item.product_id);

      if (productIds.length === 0) {
        alert('No products to save');
        return;
      }

      // Use the first order item's ID to identify the order
      const firstOrderItemId = orderItems[0]?.item_id;
      if (!firstOrderItemId) {
        alert('No order item ID found');
        return;
      }

      // Replace all order products using the POST endpoint
      const response = await fetch(
        `https://wadyai.onrender.com/api/v1/order-items/${firstOrderItemId}/products`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            product_ids: productIds,
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to replace order products');
      }

      // Update order status to "reviewed" (upload successful) after saving
      try {
        const statusResponse = await fetch(
          `https://wadyai.onrender.com/api/v1/orders/${orderId}/status`,
          {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              order_status: 'reviewed',
            }),
          }
        );

        if (statusResponse.ok) {
          setOrder(prev => ({ ...prev, order_status: 'reviewed' }));
        }
      } catch (err) {
        console.error('Failed to update order status:', err);
      }
      
      alert('Order saved successfully!');
    } catch (err) {
      console.error('Failed to save order:', err);
      alert(`Failed to save order: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-red-500">Error loading order: {error}</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full bg-gray-50">
      {/* Top Ribbon - Header with Customer Info and Actions */}
      <div className="bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/orders')}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <h1 className="text-2xl font-semibold">order</h1>
          </div>
          
          <div className="flex gap-3">
            <button 
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'saving...' : 'save'}</span>
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300">
              <Trash2 className="w-4 h-4" />
              <span>delete</span>
            </button>
          </div>
        </div>

        {/* Customer Info */}
        <div className="flex items-center gap-6 text-sm text-gray-600">
          <div className="flex items-center gap-2">
            <span>📅</span>
            <span>{order.created_at ? formatDate(order.created_at) : '—'}</span>
          </div>
          <div className="flex items-center gap-2">
            <span>👤</span>
            <span>{inboxItem?.sender_name || 'Unknown Customer'}</span>
          </div>
          <div className="flex items-center gap-2">
            <span>✉️</span>
            <span>{inboxItem?.sender_email || order.supplier_email || '—'}</span>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden pb-16">
        {/* Left Panel - Order Details */}
        <div className="flex-1 overflow-auto p-6">
          <div className="max-w-3xl">
            {/* Order Details Grid */}
            <div className="space-y-4 mb-8">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-200 rounded-lg p-4">
                  <label className="text-sm text-gray-600 mb-2 block">account code</label>
                  <div className="bg-gray-100 rounded-lg px-3 py-2 text-gray-900">
                    {order.customer_id || '—'}
                  </div>
                </div>
                <div className="bg-gray-200 rounded-lg p-4">
                  <label className="text-sm text-gray-600 mb-2 block">PO number</label>
                  <div className="bg-gray-100 rounded-lg px-3 py-2 text-gray-900">
                    {order.po_number || '—'}
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
                <label className="text-sm text-gray-600 mb-2 block">confirmed delivery</label>
                <Popover open={deliveryDateOpen} onOpenChange={setDeliveryDateOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-between font-normal bg-gray-100 border-0 hover:bg-gray-200"
                    >
                      {order.delivery_date ? new Date(order.delivery_date).toLocaleDateString() : "Select delivery date"}
                      <CalendarIcon className="w-4 h-4 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto overflow-hidden p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={order.delivery_date ? new Date(order.delivery_date) : undefined}
                      onSelect={handleDeliveryDateChange}
                      captionLayout="dropdown"
                      fromYear={2020}
                      toYear={2030}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
                <label className="text-sm text-gray-600 mb-2 block">delivery instructions</label>
                <Input 
                  value={deliveryInstructions}
                  onChange={(e) => handleDeliveryInstructionsChange(e.target.value)}
                  placeholder="Enter delivery instructions"
                  className="bg-gray-100 border-0"
                />
              </div>
            </div>

            {/* Items Section */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-semibold">items</h2>
                <button
                  onClick={handleAddItem}
                  className="flex items-center gap-2 px-3 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-800"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-4">
                {orderItems.map((item, idx) => (
                  <div key={item.item_id || idx} className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
                    <div className="flex items-center gap-4">
                      {/* Product Info - Combobox */}
                      <div className="flex-1 bg-gray-100 rounded-lg px-4 py-3">
                        <div className="text-xs text-gray-500 mb-1">{item.sku || 'SKU'}</div>
                        <Popover open={openPopovers[idx]} onOpenChange={(open) => togglePopover(idx, open)}>
                          <PopoverTrigger asChild>
                            <Button
                              variant="ghost"
                              role="combobox"
                              aria-expanded={openPopovers[idx]}
                              className="w-full justify-between p-0 h-auto font-medium text-gray-900 hover:text-blue-600 hover:bg-transparent uppercase"
                            >
                              <span className="truncate">
                                {catalogProducts.find(p => p.product_id === item.product_id)?.product_name || item.product_name || 'select matching product'}
                              </span>
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-[400px] p-0" align="start">
                            <Command>
                              <CommandInput placeholder="search products..." />
                              <CommandList>
                                <CommandEmpty>No products found.</CommandEmpty>
                                <CommandGroup>
                                  {catalogProducts.map((product) => (
<CommandItem
  key={product.product_id}
  value={`${product.product_name} ${product.sku}`.toLowerCase()}  // ✅ Changed from product.product_id
  onSelect={() => handleProductChange(idx, product.product_id)}
>
  <div className="flex flex-col flex-1">
    <span className="font-medium">{product.product_name}</span>
  </div>
  <Check
    className={cn(
      "ml-auto h-4 w-4",
      item.product_id === product.product_id ? "opacity-100" : "opacity-0"
    )}
  />
</CommandItem>
                                  ))}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                      </div>

                      {/* Unit Selection */}
                      <div className="bg-gray-100 rounded-lg px-4 py-3 w-24">
                        <div className="text-xs text-gray-500 mb-1">unit</div>
                        <div className="text-gray-900">{item.unit || 'each'}</div>
                      </div>

                      {/* Quantity Controls */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleDecrementQuantity(idx)}
                          className="w-8 h-8 flex items-center justify-center bg-gray-100 rounded hover:bg-gray-200"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <Input
                          type="number"
                          min="0"
                          value={item.quantity || 0}
                          onChange={(e) => handleQuantityChange(idx, e.target.value)}
                          className="w-20 text-center font-medium border-0 bg-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                        <button 
                          onClick={() => handleIncrementQuantity(idx)}
                          className="w-8 h-8 flex items-center justify-center bg-gray-100 rounded hover:bg-gray-200"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                        <button className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-red-500">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Additional item details */}
                    {item.ai_confidence_score && (
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <div className="flex items-center gap-2">
                          <span className="text-xs bg-black text-white px-2 py-1 rounded-full flex items-center gap-1">
                            <span>{item.ai_confidence_score}</span>
                          </span>
                          <span className="text-xs bg-zinc-300 text-zinc-700 px-2 py-1 rounded flex items-center gap-1">
                            <span>✓</span>
                            <span className="text-zinc-700">
                              {item.ai_parsed_text || item.product_name}
                            </span>
                          </span>
                        </div>
                        <div className="mt-2 text-xs text-gray-500">
                          <span>units</span>
                          <span className="ml-2 font-medium text-gray-900">{item.quantity}</span>
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                {/* Add Item Button */}
                <div className="bg-gray-100 rounded-lg p-4">
                  <Popover open={openPopovers['new']} onOpenChange={(open) => togglePopover('new', open)}>
                    <PopoverTrigger asChild>
                    </PopoverTrigger>
                    <PopoverContent className="w-[400px] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="search products..." />
                        <CommandList>
                          <CommandEmpty>No products found.</CommandEmpty>
                          <CommandGroup>
                            {catalogProducts.map((product) => (
                              <CommandItem
                                key={product.product_id}
                                value={`${product.product_name} ${product.sku}`.toLowerCase()}
                                onSelect={() => handleProductChange(orderItems.length, product.product_id)}
                              >
                                <div className="flex flex-col flex-1">
                                  <span className="font-medium">{product.product_name}</span>
                                  <span className="text-xs text-gray-500">{product.sku}</span>
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel - Email Preview */}
        <div className="w-[500px] bg-white border-l border-gray-200 overflow-auto">
          <div className="p-6">
            {/* Email Header */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">{inboxItem?.subject || 'Email'}</h2>
                <button className="text-gray-400 hover:text-gray-600">
                  <span className="text-xl">←</span>
                </button>
              </div>
              
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <span>👤</span>
                  <span className="font-medium">{inboxItem?.sender_name || 'Unknown'}</span>
                  <span className="text-gray-400 ml-auto">{inboxItem?.sender_email || '—'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span>📅</span>
                  <span>{inboxItem?.received_at ? formatDate(inboxItem.received_at) : '—'}</span>
                  <span className="text-gray-400 ml-auto">
                    {inboxItem?.received_at ? formatTime(inboxItem.received_at) : '—'}
                  </span>
                </div>
              </div>
            </div>

            {/* Email Body */}
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-gray-700 whitespace-pre-wrap">
                {inboxItem?.email_body_text || 'No email content available'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
