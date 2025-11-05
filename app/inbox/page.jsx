'use client';

import React, { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { Search, Package, Mail, AlertCircle, Info, RotateCcw, CalendarIcon, X, RotateCw, RefreshCcw } from 'lucide-react'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { useApi } from '@/hooks/useApi'

const API_BASE_URL = 'https://wadyai.onrender.com/api/v1';

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

// Transform API data to match our email card format
const transformToEmailItem = (item, orders = []) => ({
  subject: item.subject || 'No Subject',
  from: item.sender_name || 'Unknown Sender',
  fromEmail: item.sender_email || '',
  to: item.supplier_email || 'N/A',
  toEmail: item.supplier_email || '',
  date: formatDate(item.received_at),
  time: formatTime(item.received_at),
  orders: orders, // Array of order objects linked to this inbox item
  tag: item.ai_labels?.[0] || null,
  hasRefresh: item.error_code != null,
  itemId: item.item_id,
  status: item.current_status
});

const EmailCard = ({ item }) => {
  const router = useRouter();
  
  return (
    <div className="bg-white rounded-lg p-4 mb-3 shadow-sm border border-gray-200">
      <div className="flex justify-between items-start mb-3">
        <h3 className="font-semibold text-gray-900 flex-1 pr-2 py-2 border-b-2">{item.subject}</h3>
        <div className="flex gap-2">
          <Info className="w-5 h-5 text-gray-400" />
          {item.hasRefresh && <RotateCcw className="w-5 h-5 text-gray-400" />}
        </div>
      </div>
      
      <div className="space-y-2 text-sm mb-3">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2 text-gray-600">
            <span className="w-4 h-4 rounded-full bg-gray-300 flex items-center justify-center text-xs"></span>
            <span>{item.from}</span>
          </div>
          <span className="text-gray-400">{item.fromEmail}</span>
        </div>
        
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2 text-gray-600">
            <Mail className="w-4 h-4" />
            <span className="truncate max-w-[200px]">{item.to}</span>
          </div>
          <span className="text-gray-400 text-xs truncate max-w-[200px]">{item.toEmail}</span>
        </div>
        
        <div className="flex items-center gap-2 text-gray-600">
          <span className="w-4 h-4 flex items-center justify-center">🕐</span>
          <span>{item.date} {item.time}</span>
        </div>
      </div>

      <div className="flex gap-2 items-center flex-wrap">
        {item.orders && item.orders.length > 0 ? (
          item.orders.map((order, idx) => (
            <button 
              key={idx} 
              onClick={() => router.push(`/orders/${order.order_id}`)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 transition-colors"
            >
              <Package className="w-3.5 h-3.5" />
              <span>view order</span>
            </button>
          ))
        ) : (
          <button className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 transition-colors">
            <Package className="w-3.5 h-3.5" />
            <span>convert to order</span>
          </button>
        )}
        {item.tag && (
          <span className="ml-auto text-xs bg-gray-100 px-2 py-1 rounded">{item.tag}</span>
        )}
      </div>
    </div>
  );
};

const CategoryColumn = ({ title, icon: Icon, count, items, iconColor, iconBg, loading }) => (
  <div className="flex flex-col h-full">
    <div className="flex items-center justify-between mb-4 pb-3 border-b">
      <div className="flex items-center gap-2">
        <div className={`${iconBg} p-1.5 rounded`}>
          <Icon className={`w-5 h-5 ${iconColor}`} />
        </div>
        <h2 className="text-xl font-semibold">{title}</h2>
        <span className="text-gray-400 text-sm">{count}</span>
      </div>
    </div>
    
    <div className="flex-1 overflow-y-auto bg-gray-200 p-3 rounded-lg">
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <LoadingSpinner />
        </div>
      ) : items.length === 0 ? (
        <div className="text-center text-gray-400 py-8">No items</div>
      ) : (
        items.map((item, idx) => (
          <EmailCard key={item.itemId || idx} item={item} />
        ))
      )}
    </div>
  </div>
)

export default function InboxPage() {
  const { data: inboxItems, loading, error } = useApi(`${API_BASE_URL}/inbox/items`);
  const [itemsWithOrders, setItemsWithOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState({ from: null, to: null });
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Handle refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const response = await fetch(`${API_BASE_URL}/refresh`);
      if (response.ok) {
        // Reload the page to fetch fresh data
        window.location.reload();
      } else {
        console.error('Failed to refresh application');
      }
    } catch (err) {
      console.error('Error refreshing application:', err);
    } finally {
      setRefreshing(false);
    }
  };

  // Fetch orders for each inbox item
  useEffect(() => {
    if (!inboxItems) return;

    const fetchOrdersForItems = async () => {
      setLoadingOrders(true);
      try {
        const itemsWithOrdersData = await Promise.all(
          inboxItems.map(async (item) => {
            try {
              const response = await fetch(`${API_BASE_URL}/orders/inbox/${item.item_id}`);
              if (response.ok) {
                const orders = await response.json();
                return transformToEmailItem(item, orders);
              }
            } catch (err) {
              console.error(`Failed to fetch orders for inbox item ${item.item_id}:`, err);
            }
            return transformToEmailItem(item, []);
          })
        );
        setItemsWithOrders(itemsWithOrdersData);
      } catch (err) {
        console.error('Failed to fetch orders for inbox items:', err);
      } finally {
        setLoadingOrders(false);
      }
    };

    fetchOrdersForItems();
  }, [inboxItems]);

  // Filter items based on search query and date
  const filteredItems = useMemo(() => {
    if (!itemsWithOrders || itemsWithOrders.length === 0) return { orders: [], notOrders: [] };
    
    const filtered = itemsWithOrders.filter(item => {
      // Search filter - check subject and sender
      const matchesSearch = !searchQuery || 
        item.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.from.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.fromEmail.toLowerCase().includes(searchQuery.toLowerCase());
      
      // Date range filter - check if item was received within the date range
      const matchesDate = (!dateRange.from && !dateRange.to) || (() => {
        if (!item.date) return false;
        
        // Parse the item date (format: MM/DD)
        const [month, day] = item.date.split('/').map(Number);
        const currentYear = new Date().getFullYear();
        const itemDate = new Date(currentYear, month - 1, day);
        
        const fromDate = dateRange.from ? new Date(dateRange.from) : null;
        const toDate = dateRange.to ? new Date(dateRange.to) : null;
        
        // Normalize dates to remove time component
        if (fromDate) fromDate.setHours(0, 0, 0, 0);
        if (toDate) toDate.setHours(23, 59, 59, 999);
        itemDate.setHours(0, 0, 0, 0);
        
        // Check if item date is within range
        if (fromDate && toDate) {
          return itemDate >= fromDate && itemDate <= toDate;
        } else if (fromDate) {
          return itemDate >= fromDate;
        } else if (toDate) {
          return itemDate <= toDate;
        }
        return true;
      })();
      
      return matchesSearch && matchesDate;
    });

    // Separate items by status
    const orders = filtered.filter(item => item.status === 'InboxStatus.ORDERS');
    const notOrders = filtered.filter(item => item.status === 'InboxStatus.NOT_ORDERS');

    return { orders, notOrders };
  }, [itemsWithOrders, searchQuery, dateRange]);

  return (
    <div className='flex flex-col h-full w-full bg-gray-50'>
      {/* Header */}
      <div className='px-6 py-4 bg-white border-b'>
        <div className='flex items-center justify-between mb-4'>
          <h1 className='text-3xl font-semibold'>inbox</h1>

        </div>
        <div className='flex items-center gap-3'>
          <div className='relative flex-1 max-w-md'>
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input 
              placeholder="search by email address or subject" 
              className="pl-10 pr-10 bg-gray-100 border-0"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          
          <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={`justify-between font-normal bg-gray-100 border-0 hover:bg-gray-200 ${(dateRange.from || dateRange.to) ? 'text-gray-900' : 'text-gray-500'}`}
              >
                <CalendarIcon className="w-4 h-4 mr-2" />
                {dateRange.from ? (
                  dateRange.to ? (
                    `${dateRange.from.toLocaleDateString()} - ${dateRange.to.toLocaleDateString()}`
                  ) : (
                    `From ${dateRange.from.toLocaleDateString()}`
                  )
                ) : dateRange.to ? (
                  `Until ${dateRange.to.toLocaleDateString()}`
                ) : (
                  "filter by date range"
                )}
                {(dateRange.from || dateRange.to) && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setDateRange({ from: null, to: null });
                    }}
                    className="ml-2 hover:text-gray-700"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto overflow-hidden p-0" align="start">
              <Calendar
                mode="range"
                selected={dateRange}
                onSelect={(range) => {
                  setDateRange(range || { from: null, to: null });
                }}
                captionLayout="dropdown"
                fromYear={2020}
                toYear={2030}
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>

          {(searchQuery || dateRange.from || dateRange.to) && (
            <Button
              variant="outline"
              onClick={() => {
                setSearchQuery('');
                setDateRange({ from: null, to: null });
              }}
              className="bg-gray-100 border-0 hover:bg-gray-200"
            >
              <RotateCw className="w-4 h-4 mr-2" />
              Reset
            </Button>
          )}
        </div>
        
        {(searchQuery || dateRange.from || dateRange.to) && (
          <div className="mt-3 flex items-center gap-2">
            <span className="text-sm text-gray-600">
              Showing {filteredItems.orders.length + filteredItems.notOrders.length} of {itemsWithOrders.length} items
            </span>
            {(searchQuery || dateRange.from || dateRange.to) && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setDateRange({ from: null, to: null });
                }}
                className="text-sm text-blue-600 hover:underline"
              >
                Clear filters
              </button>
            )}
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="mx-6 mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          Error loading inbox items: {error}
        </div>
      )}

      {/* Three Column Layout */}
      <div className='grid grid-cols-2 gap-6 p-6 flex-1 overflow-hidden'>
        <CategoryColumn 
          title="orders" 
          icon={Package}
          iconColor="text-green-600"
          iconBg="bg-green-50"
          count={filteredItems.orders.length}
          items={filteredItems.orders}
          loading={loading || loadingOrders}
        />
        <CategoryColumn 
          title="not orders" 
          icon={Mail}
          iconColor="text-gray-600"
          iconBg="bg-gray-100"
          count={filteredItems.notOrders.length}
          items={filteredItems.notOrders}
          loading={loading || loadingOrders}
        />
      </div>
    </div>
  )
}


