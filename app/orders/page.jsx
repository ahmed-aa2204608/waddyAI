'use client';

import React, { useMemo, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { Search, Filter, Table as TableIcon, LayoutGrid, Trash2, ChevronDown, ChevronRight } from 'lucide-react'
import { useApi } from '@/hooks/useApi'

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

const StatusIcon = ({ status }) => {
  const icons = {
    'waiting for review': '☀️',
    'uploading pending': '⏱️',
    'upload successful': '✓',
    'archived': '📦'
  };
  
  const colors = {
    'waiting for review': 'text-orange-500',
    'uploading pending': 'text-purple-500',
    'upload successful': 'text-green-500',
    'archived': 'text-gray-400'
  };
  
  return (
    <span className={`text-xl ${colors[status]}`}>
      {icons[status]}
    </span>
  );
};

const OrderRow = ({ order, customer }) => {
  const [isExpanded, setIsExpanded] = React.useState(false);
  const router = useRouter();
  
  const handleRowClick = (e) => {
    // Don't navigate if clicking on the expand button or delete button
    if (e.target.closest('button')) {
      return;
    }
    router.push(`/orders/${order.order_id}`);
  };
  
  return (
    <tr 
      className="border-b border-gray-200 hover:bg-gray-50 cursor-pointer"
      onClick={handleRowClick}
    >
      <td className="py-4 px-4">
        <button 
          onClick={(e) => {
            e.stopPropagation();
            setIsExpanded(!isExpanded);
          }}
          className="text-gray-400 hover:text-gray-600"
        >
          {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>
      </td>
      <td className="py-4 px-4 text-gray-700">{order.po_number || '—'}</td>
      <td className="py-4 px-4 text-gray-900">{customer}</td>
      <td className="py-4 px-4 text-gray-700">{order.delivery_date ? formatDate(order.delivery_date) : '—'}</td>
      <td className="py-4 px-4">
        <div className="flex items-center gap-2">
          <span className="text-gray-700">{order.items_count || 0}</span>
        </div>
      </td>
      <td className="py-4 px-4 text-gray-700">
        {order.updated_at ? `${formatDate(order.updated_at)}, ${formatTime(order.updated_at)}` : '—'}
      </td>
      <td className="py-4 px-4 text-gray-700">—</td>
      <td className="py-4 px-4">
        <button 
          onClick={(e) => e.stopPropagation()}
          className="text-gray-400 hover:text-red-500"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </td>
    </tr>
  );
};

const StatusGroup = ({ status, orders, count, expanded, onToggle }) => {
  const displayStatus = {
    'waiting for review': 'waiting for review',
    'uploading pending': 'uploading pending',
    'upload successful': 'upload successful',
    'archived': 'archived'
  }[status];
  

  
  return (
    <>
      <tr className="bg-gray-100">
        <td colSpan="8" className="py-3 px-4">
          <button 
            onClick={onToggle}
            className="flex items-center gap-3 w-full text-left"
          >
            <StatusIcon status={displayStatus} />
            <span className="font-semibold text-gray-900">{displayStatus}</span>
            <span className="text-gray-500">{count}</span>
            <ChevronDown className={`w-4 h-4 ml-auto text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`} />
          </button>
        </td>
      </tr>
      {expanded && orders.map((order, idx) => (
        <OrderRow key={order.order_id || idx} order={order} customer={order.customer_name || 'Unknown Customer'} />
      ))}
    </>
  );
};

export default function OrdersPage() {
  const { data: orders, loading, error } = useApi('https://wadyai.onrender.com/api/v1/orders');
  const [customerNames, setCustomerNames] = useState({});
  const [orderItemCounts, setOrderItemCounts] = useState({});
  const [expandedGroups, setExpandedGroups] = React.useState({
    'waiting for review': true,
    'uploading pending': false,
    'upload successful': false,
    'archived': false
  });
  
  // Fetch customer names and order items for all orders
  useEffect(() => {
    if (!orders) return;
    
    const fetchOrderData = async () => {
      const names = {};
      const itemCounts = {};
      
      // Fetch customer names and order items in parallel
      await Promise.all(
        orders.map(async (order) => {
          // Fetch customer name
          if (order.inbox_item_id) {
            try {
              const response = await fetch(`https://wadyai.onrender.com/api/v1/inbox/items/${order.inbox_item_id}`);
              if (response.ok) {
                const data = await response.json();
                names[order.inbox_item_id] = data.sender_name || 'Unknown Customer';
              }
            } catch (err) {
              console.error(`Failed to fetch customer for inbox_item_id ${order.inbox_item_id}:`, err);
              names[order.inbox_item_id] = 'Unknown Customer';
            }
          }
          
          // Fetch order items count
          if (order.order_id) {
            try {
              const response = await fetch(`https://wadyai.onrender.com/api/v1/order-items/order/${order.order_id}`);
              if (response.ok) {
                const items = await response.json();
                itemCounts[order.order_id] = items.length;
              }
            } catch (err) {
              console.error(`Failed to fetch order items for order_id ${order.order_id}:`, err);
              itemCounts[order.order_id] = 0;
            }
          }
        })
      );
      
      setCustomerNames(names);
      setOrderItemCounts(itemCounts);
    };
    
    fetchOrderData();
  }, [orders]);
  
  // Group orders by status
  const groupedOrders = useMemo(() => {
    if (!orders) return {};
    
    const groups = {
      'waiting for review': [],
      'uploading pending': [],
      'upload successful': [],
      'archived': []
    };
    
    orders.forEach(order => {
      // Map order_status to display groups
      const statusMap = {
        'new': 'waiting for review',
        'reviewing': 'uploading pending',
        'reviewed': 'upload successful',
        'archived': 'archived'
      };
      
      const group = statusMap[order.order_status] || 'waiting for review';
      
      // Add default values for missing data
      const enrichedOrder = {
        ...order,
        customer_name: customerNames[order.inbox_item_id] || 'Loading...',
        items_count: orderItemCounts[order.order_id] !== undefined ? orderItemCounts[order.order_id] : 0,
        completion_percentage: order.completion_percentage !== undefined 
          ? order.completion_percentage 
          : null
      };
      
      groups[group].push(enrichedOrder);
    });
    
    return groups;
  }, [orders, customerNames, orderItemCounts]);
  
  const toggleGroup = (status) => {
    setExpandedGroups(prev => ({
      ...prev,
      [status]: !prev[status]
    }));
  };

  return (
    <div className='flex flex-col h-full w-full bg-gray-50'>
      {/* Header */}
      <div className='px-6 py-4 bg-white border-b'>
        <div className='flex items-center justify-between mb-4'>
          <div>
            <h1 className='text-3xl font-semibold mb-1'>order hub</h1>
            <p className='text-sm text-gray-500'>
              forward all order emails to{' '}
              <span className='text-blue-600 underline'>wadyreciver@gmail.com</span>
            </p>
          </div>
          
          <div className='flex items-center gap-3'>
            <div className='relative'>
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input 
                placeholder="search by order or customer details" 
                className="pl-10 bg-gray-100 border-0 w-80"
              />
            </div>
            
            <button className='flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-md hover:bg-gray-200'>
              <Filter className="w-4 h-4" />
              <span>filter</span>
            </button>
            
            <button className='flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-md hover:bg-gray-800'>
              <TableIcon className="w-4 h-4" />
              <span>table</span>
            </button>
            
            <button className='flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-md hover:bg-gray-200'>
              <LayoutGrid className="w-4 h-4" />
              <span>board</span>
            </button>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mx-6 mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          Error loading orders: {error}
        </div>
      )}

      {/* Table */}
      <div className='flex-1 overflow-auto px-6 py-4'>
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <LoadingSpinner size="large" />
          </div>
        ) : (
          <table className="w-full bg-white rounded-lg shadow-sm">
            <thead className="border-b border-gray-200">
              <tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <th className="py-3 px-4 w-12"></th>
                <th className="py-3 px-4">PO NUMBER</th>
                <th className="py-3 px-4">CUSTOMER</th>
                <th className="py-3 px-4">DELIVERY</th>
                <th className="py-3 px-4">ITEMS</th>
                <th className="py-3 px-4">LAST UPDATE</th>
                <th className="py-3 px-4">REKKI ORDER</th>
                <th className="py-3 px-4 w-12"></th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(groupedOrders).map(([status, statusOrders]) => (
                <StatusGroup
                    key={status}
                    status={status}
                    orders={statusOrders}
                    count={statusOrders.length}
                    expanded={expandedGroups[status]}
                    onToggle={() => toggleGroup(status)}
                />
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
