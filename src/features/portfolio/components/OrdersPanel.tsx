import { XCircle } from "lucide-react";
import Button from "../../../components/ui/Button";
import Amount from "../../../components/common/Amount";
import { usePortfolioOrders } from "../hooks/usePortfolioOrders";
import { formatPercent } from "../utils/styles";

export default function OrdersPanel() {
  const { orders, loading, cancelOrder, deleteOrder } = usePortfolioOrders();

  if (loading) {
    return <div className="text-center text-muted-foreground p-8">Loading orders...</div>;
  }

  if (orders.length === 0) {
    return (
      <div className="bento-card p-12 text-center space-y-3">
        <h3 className="text-lg font-bold">No Pending Orders</h3>
        <p className="text-sm text-muted-foreground">You have no active limit orders.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {orders.map((order) => (
        <div key={order.id} className="bento-card p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold">{order.symbol}</span>
              <span className="text-xs uppercase px-2 py-0.5 rounded-full bg-muted/60 font-semibold tracking-wider">
                {order.orderType} {order.type}
              </span>
              <span className={`text-xs uppercase px-2 py-0.5 rounded-full font-semibold tracking-wider ${order.status === 'pending' ? 'bg-amber-500/20 text-amber-600' : order.status === 'executed' ? 'bg-emerald-500/20 text-emerald-600' : 'bg-red-500/20 text-red-600'}`}>
                {order.status}
              </span>
            </div>
            <div className="text-sm text-muted-foreground mt-1">
              {order.quantity} shares @ Target Price: <Amount value={order.targetPrice} />
            </div>
          </div>
          
          <div className="flex items-center gap-3 w-full md:w-auto">
            {order.status === "pending" && (
              <Button
                variant="ghost"
                className="text-red-500 hover:text-red-600 hover:bg-red-500/10 w-full md:w-auto"
                onClick={() => cancelOrder(order.id)}
                icon={<XCircle size={16} />}
              >
                Cancel
              </Button>
            )}
            {order.status !== "pending" && (
              <Button
                variant="ghost"
                className="text-muted-foreground hover:bg-muted w-full md:w-auto"
                onClick={() => deleteOrder(order.id)}
                icon={<XCircle size={16} />}
              >
                Remove
              </Button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
