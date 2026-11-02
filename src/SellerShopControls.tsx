import { useEffect, useState } from 'react';
import { FileText, TicketPercent, Save, Plus, Trash2, RefreshCw } from 'lucide-react';

type Props = { section: 'policies'|'coupons'; onNotice?: (message:string)=>void };
async function responseData(r:Response){const d=await r.json().catch(()=>({}));if(!r.ok)throw Error(d.error||'Request failed.');return d;}
const emptyPolicy={contactPhone:'',contactEmail:'',termsAndConditions:'',privacyPolicy:'',returnPolicy:'',deliveryPolicy:''};
export function SellerShopControls({section,onNotice}:Props){
 const [policy,setPolicy]=useState<any>(emptyPolicy),[coupons,setCoupons]=useState<any[]>([]),[loading,setLoading]=useState(true),[saving,setSaving]=useState(false),[error,setError]=useState('');
 const [draft,setDraft]=useState<any>({code:'',discountType:'percentage',discountValue:'10',minimumOrder:'0',maxUses:'',expiresAt:''});
 async function load(){setLoading(true);setError('');try{const [a,b]=await Promise.all([fetch('/api/store?action=store-settings',{credentials:'same-origin',cache:'no-store'}),fetch('/api/store?action=coupons',{credentials:'same-origin',cache:'no-store'})]);const [pd,cd]=await Promise.all([responseData(a),responseData(b)]);setPolicy({...emptyPolicy,...pd.settings});setCoupons(cd.coupons||[]);}catch(e:any){setError(e.message||'Could not load shop settings.');}finally{setLoading(false);}}
 useEffect(()=>{load();},[section]);
 async function savePolicies(e:any){e.preventDefault();setSaving(true);setError('');try{await responseData(await fetch('/api/store?action=store-settings',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',body:JSON.stringify(policy)}));onNotice?.('Shop policies and contact details saved. Buyers will see the published version in your shop.');}catch(e:any){setError(e.message||'Could not save settings.');}finally{setSaving(false);}}
 async function addCoupon(e:any){e.preventDefault();setSaving(true);setError('');try{const d=await responseData(await fetch('/api/store?action=coupon',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',body:JSON.stringify(draft)}));setCoupons(v=>[d.coupon,...v]);setDraft({code:'',discountType:'percentage',discountValue:'10',minimumOrder:'0',maxUses:'',expiresAt:''});onNotice?.('Coupon created and published to your shop.');}catch(e:any){setError(e.message||'Could not create coupon.');}finally{setSaving(false);}}
 async function toggleCoupon(c:any){setError('');try{const d=await responseData(await fetch('/api/store?action=coupon',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',body:JSON.stringify({id:c.id,isActive:!c.is_active})}));setCoupons(v=>v.map(x=>x.id===c.id?d.coupon:x));}catch(e:any){setError(e.message||'Could not update coupon.');}}
 async function deleteCoupon(id:string){if(!window.confirm('Delete this coupon?'))return;try{await responseData(await fetch('/api/store?action=coupon&id='+encodeURIComponent(id),{method:'DELETE',credentials:'same-origin'}));setCoupons(v=>v.filter(x=>x.id!==id));}catch(e:any){setError(e.message||'Could not delete coupon.');}}
 if(loading)return <div className="seller-loading"><span className="seller-spinner"/>Loading shop controls…</div>;
 return <section className="seller-shop-controls">
  {section==='policies'?<><div className="seller-page-heading"><div><h2>Shop policies & buyer information</h2><p>These details appear in your storefront and buyer account. Keep them accurate and easy to understand.</p></div></div>
   <form className="seller-editor seller-settings-form" onSubmit={savePolicies}>
    <h3><FileText size={17}/> Seller contact details</h3>
    <label>Customer support phone<input type="tel" value={policy.contactPhone||''} onChange={e=>setPolicy({...policy,contactPhone:e.target.value})} placeholder="0712 345 678 or +254712345678"/><small>Used by Shopping Assistance and shop contact links. If blank, your shop WhatsApp number is used.</small></label>
    <label>Customer support email<input type="email" value={policy.contactEmail||''} onChange={e=>setPolicy({...policy,contactEmail:e.target.value})} placeholder="support@yourshop.co.ke"/></label>
    <label>Terms & Conditions<textarea rows={10} maxLength={20000} value={policy.termsAndConditions||''} onChange={e=>setPolicy({...policy,termsAndConditions:e.target.value})} placeholder="Explain order acceptance, pricing, payment, warranties, returns and buyer responsibilities."/></label>
    <label>Privacy Policy<textarea rows={10} maxLength={20000} value={policy.privacyPolicy||''} onChange={e=>setPolicy({...policy,privacyPolicy:e.target.value})} placeholder="Explain what customer information you collect, why you use it, how long you keep it and how buyers can contact you."/></label>
    <label>Returns, refunds & exchanges<textarea rows={7} maxLength={12000} value={policy.returnPolicy||''} onChange={e=>setPolicy({...policy,returnPolicy:e.target.value})} placeholder="Set your return window, eligible conditions, refund method and exclusions."/></label>
    <label>Delivery & collection policy<textarea rows={7} maxLength={12000} value={policy.deliveryPolicy||''} onChange={e=>setPolicy({...policy,deliveryPolicy:e.target.value})} placeholder="Set delivery areas, fees, estimated timelines, collection arrangements and delays."/></label>
    <p className="seller-muted">Use clear, lawful and accurate wording. DASNET provides the publishing tools; each seller is responsible for their own policies.</p>
    <button className="seller-primary-btn" disabled={saving}><Save size={15}/>{saving?'Saving…':'Save and publish buyer-facing details'}</button>
   </form>
  </>:<><div className="seller-page-heading"><div><h2>Coupons & promotions</h2><p>Create discount codes buyers can view and redeem during checkout.</p></div></div>
   <form className="seller-editor seller-settings-form" onSubmit={addCoupon}>
    <h3><TicketPercent size={17}/> Create a coupon</h3>
    <label>Coupon code<input required maxLength={32} value={draft.code} onChange={e=>setDraft({...draft,code:e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g,'')})} placeholder="WELCOME10"/></label>
    <label>Discount type<select value={draft.discountType} onChange={e=>setDraft({...draft,discountType:e.target.value})}><option value="percentage">Percentage (%)</option><option value="fixed">Fixed amount (KES)</option></select></label>
    <label>Discount value<input type="number" required min="0.01" step="0.01" value={draft.discountValue} onChange={e=>setDraft({...draft,discountValue:e.target.value})}/></label>
    <label>Minimum order (KES)<input type="number" min="0" step="1" value={draft.minimumOrder} onChange={e=>setDraft({...draft,minimumOrder:e.target.value})}/></label>
    <label>Maximum redemptions<input type="number" min="1" step="1" value={draft.maxUses} onChange={e=>setDraft({...draft,maxUses:e.target.value})} placeholder="Unlimited"/></label>
    <label>Expiry date<input type="date" value={draft.expiresAt} onChange={e=>setDraft({...draft,expiresAt:e.target.value})}/></label>
    <button className="seller-primary-btn" disabled={saving}><Plus size={15}/>{saving?'Saving…':'Create coupon'}</button>
   </form>
   <div className="seller-table-panel"><div className="seller-table-scroll"><table className="seller-table"><thead><tr><th>Code</th><th>Offer</th><th>Redemptions</th><th>Expiry</th><th>Status</th><th>Actions</th></tr></thead><tbody>{coupons.map(c=><tr key={c.id}><td><strong>{c.code}</strong></td><td>{c.discount_type==='percentage'?c.discount_value+'% off':'KES '+Number(c.discount_value).toLocaleString('en-KE')+' off'}<small>Minimum KES {(Number(c.minimum_order_minor||0)/100).toLocaleString('en-KE')}</small></td><td>{c.used_count}{c.max_uses?' / '+c.max_uses:' / ∞'}</td><td>{c.expires_at?new Date(c.expires_at).toLocaleDateString('en-KE'):'No expiry'}</td><td><span className={c.is_active?'seller-status-success':'seller-status-muted'}>{c.is_active?'Active':'Paused'}</span></td><td><button type="button" className="seller-secondary-btn" onClick={()=>toggleCoupon(c)}>{c.is_active?'Pause':'Activate'}</button> <button type="button" className="seller-secondary-btn" onClick={()=>deleteCoupon(c.id)}><Trash2 size={14}/></button></td></tr>)}</tbody></table>{!coupons.length&&<p className="seller-empty">No coupons yet. Create your first discount code above.</p>}</div></div>
  </>}
  {error&&<p className="auth-message error seller-alert" role="alert">{error}</p>}
 </section>;
}
