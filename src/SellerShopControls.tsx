import { useEffect, useMemo, useState } from 'react';
import { FileText, TicketPercent, Save, Plus, Trash2, Store, ShieldCheck, Truck, RotateCcw, Phone, Mail, Eye, PencilLine, CheckCircle2 } from 'lucide-react';

type Props = { section: 'policies'|'coupons'; shopName?:string; shopWhatsappNumber?:string; shopContactEmail?:string; onNotice?: (message:string)=>void };
async function responseData(r:Response){const d=await r.json().catch(()=>({}));if(!r.ok)throw Error(d.error||'Request failed.');return d;}
const emptyPolicy={contactPhone:'',contactEmail:'',termsAndConditions:'',privacyPolicy:'',returnPolicy:'',deliveryPolicy:'',deliveryHomeFee:0,deliveryPickupFee:0,faqs:[] as any[]};
const policySections=[
 {id:'overview',label:'Overview',icon:Store,title:'Shop information'},
 {id:'terms',label:'Terms',icon:FileText,title:'Terms & conditions',field:'termsAndConditions',hint:'Explain order acceptance, pricing, payment, warranties and buyer responsibilities.'},
 {id:'privacy',label:'Privacy',icon:ShieldCheck,title:'Privacy policy',field:'privacyPolicy',hint:'Explain what buyer information you receive, why you use it, how it is protected and how buyers can contact you.'},
 {id:'returns',label:'Returns',icon:RotateCcw,title:'Returns, refunds & exchanges',field:'returnPolicy',hint:'Set your return window, eligible conditions, refund method, exchange rules and exclusions.'},
 {id:'delivery',label:'Delivery',icon:Truck,title:'Delivery & collection',field:'deliveryPolicy',hint:'Set delivery areas, fees, estimated timelines, collection arrangements and delays.'},
 {id:'contact',label:'Contact',icon:Phone,title:'Customer contact details'},
 {id:'faqs',label:'FAQs',icon:FileText,title:'Frequently asked questions'},
] as const;
function defaultTerms(name:string){return \`1. ABOUT THE SHOP AND THESE TERMS
This online shop is operated by \${name} (the “Seller”). These terms explain the conditions that apply when you browse this shop, place an order or communicate with the Seller. Please read them together with the product listing, checkout summary, delivery information, Returns & Refunds Policy, Privacy Policy and the mandatory DASMARKET platform notices displayed separately on this storefront.

2. THE SELLER AND DASMARKET
The Seller independently operates this shop and is responsible for its products, descriptions, prices, stock, order acceptance, packaging, fulfilment, delivery, after-sales service, warranties, returns and refunds. DASMARKET supplies technology and marketplace tools that enable the shop to operate online. Unless a service is expressly identified as being supplied by DASMARKET, the contract for a purchase is between the buyer and the Seller. Nothing in these terms removes any responsibility that applicable law places on DASMARKET for its own services, conduct or obligations.

3. PRODUCT INFORMATION AND AVAILABILITY
The Seller aims to keep product descriptions, photographs, specifications, variations, prices and stock information accurate and current. Images are illustrative where the listing says so; colours and appearance may vary between screens. Buyers should review dimensions, compatibility, condition, quantity and other material details before ordering. If a material listing error or stock shortage is discovered, the Seller will contact the buyer and explain the available options, including cancellation and any refund due. The Seller must not knowingly publish misleading descriptions or represent used, refurbished or substituted goods as new.

4. PRICES, TAXES AND OTHER CHARGES
Prices are displayed in Kenya Shillings (KES) unless the listing states otherwise. The checkout summary should show the order value and any delivery or collection charge before payment. The buyer is responsible for checking the final total and the payment recipient before authorising payment. The Seller may correct genuine pricing errors before accepting an order, but must communicate the correction and obtain the buyer’s agreement before proceeding. No undisclosed charge should be added after an order is placed.

5. ORDER PLACEMENT AND ACCEPTANCE
Submitting an order is a request to purchase the selected items; it is not, by itself, proof that the Seller has accepted or fulfilled the order. The Seller will process the order using the contact and delivery information supplied by the buyer. The Seller may decline or cancel an order where an item is unavailable, information is materially incomplete, a suspected fraudulent instruction is identified, or fulfilment is otherwise unlawful or impossible. Where payment has already been received, the Seller must arrange the refund or other remedy required by applicable law and the circumstances. Order confirmations, messages and payment references should be retained.

6. PAYMENT AND PAYMENT SECURITY
Payments are made directly to the Seller or to the payment provider or merchant destination configured by the Seller. DASMARKET does not receive, hold, escrow, pool or guarantee the Seller’s sale proceeds. Before paying, verify the displayed merchant or recipient name, Till or PayBill details, account reference and amount. Do not pay to a changed or personal number merely because a message requests it; independently confirm any changed instructions using the shop’s published contact details. Never disclose an M-PESA PIN, card security code, password or one-time verification code to the Seller, DASMARKET or another person. A pending prompt or screenshot is not confirmation of a completed payment; rely on the official payment confirmation and the order status.

7. DELIVERY, COLLECTION AND HANDOVER
Available delivery methods, areas, charges and estimates are described in the Delivery & Collection Policy or shown at checkout. Buyers must provide accurate contact and address details and remain reasonably available to coordinate handover. Collection is available only where offered and after the Seller confirms that the order is ready and identifies the collection point. The Seller remains responsible for arranging the agreed fulfilment and communicating material delays or delivery problems. Any transfer of risk or ownership is subject to applicable law and the agreed transaction.

8. CANCELLATIONS, RETURNS AND REFUNDS
Requests to cancel, return, exchange or obtain a refund must be sent to the Seller using the contact details shown on this storefront, preferably with the order number and supporting information. Eligibility, process and any lawful exclusions are set out in the Returns, Refunds & Exchanges Policy. The Seller must honour mandatory consumer rights and must not use a shop policy to exclude remedies that cannot lawfully be excluded. Where a refund is due, the Seller is responsible for arranging it through the relevant payment channel and communicating the status to the buyer. DASMARKET does not hold the funds paid directly to the Seller and cannot promise recovery of those funds.

9. WARRANTIES AND AFTER-SALES SUPPORT
Any manufacturer warranty, seller warranty, service plan or after-sales commitment must be stated in the relevant listing or confirmed by the Seller in writing. This section does not limit guarantees or consumer protections that apply by law. Buyers should keep proof of purchase and contact the Seller promptly if a product is defective, unsafe, incomplete or materially different from its description.

10. BUYER RESPONSIBILITIES AND ACCEPTABLE USE
Buyers must provide truthful order information, use the storefront lawfully, respect the rights of others and avoid abusive, fraudulent or threatening conduct. Buyers should inspect the order summary before payment, keep transaction records and report suspected fraud promptly. Buyers must not misuse another person’s account or attempt to interfere with the shop or DASMARKET platform.

11. PRIVACY AND CUSTOMER COMMUNICATION
The Seller handles buyer information in accordance with the shop Privacy Policy and applicable data-protection requirements. Order information may be used to confirm, fulfil and support the transaction. Unrelated marketing must have a lawful basis and any consent required by law. Buyers may use the published shop contact details to ask questions about information held by the Seller.

12. COMPLAINTS AND DISPUTE HANDLING
Please contact the Seller first with the order number, a clear description of the issue and the outcome requested. The Seller should respond within a reasonable period and keep relevant order and communication records. Buyers may also use the DASMARKET reporting tools for suspected platform abuse or unresolved marketplace concerns. A report does not guarantee a refund or recovery of money paid directly to the Seller.

13. CHANGES TO THESE TERMS
The Seller may update shop-specific terms to reflect changes in products or operations. Updated terms should be published clearly and should not retrospectively remove rights already accrued or override mandatory DASMARKET notices. The version displayed when an order is placed is the relevant shop version, subject always to applicable law.

14. GOVERNING LAW AND CONSUMER RIGHTS
These terms are intended for use in Kenya and are subject to applicable Kenyan law. If any provision is unenforceable, the remaining provisions continue to apply to the extent permitted. Nothing in these terms limits a statutory consumer right or other legal protection that cannot lawfully be waived.\`; }
function defaultPrivacy(name:string){return \`1. WHO IS RESPONSIBLE FOR YOUR INFORMATION
This shop is operated by \${name} (the “Seller”). The Seller is responsible for personal information it collects directly or receives in connection with orders, enquiries, delivery, returns and after-sales support. DASMARKET separately processes information required to provide, secure and maintain the marketplace platform. The mandatory DASMARKET platform privacy notice displayed below this shop policy also applies.

2. INFORMATION THE SHOP MAY RECEIVE
Depending on how you use the shop, the Seller may receive your name, telephone number, email address, delivery address and instructions, order contents, payment reference or status, messages, return or complaint details and information you choose to provide. The Seller should only request information reasonably necessary for the relevant transaction or service. Do not send payment PINs, passwords, card security codes or one-time verification codes.

3. WHY THE INFORMATION IS USED
The Seller may use relevant information to:
• receive, confirm, prepare and fulfil orders;
• arrange delivery, collection and order updates;
• verify payment status and reconcile the relevant transaction reference;
• answer product, warranty, return and customer-service enquiries;
• investigate suspected fraud, misuse, safety concerns or disputes;
• maintain appropriate business, accounting and transaction records; and
• comply with legal obligations or establish, exercise or defend legal claims.
The Seller must not use checkout information for unrelated purposes that are incompatible with the reason it was collected.

4. LAWFUL PROCESSING AND MARKETING
The Seller must have a lawful basis for processing personal information and provide any notice required by applicable data-protection law. Where consent is relied upon, it must be freely given, specific and capable of withdrawal. Your decision to decline optional marketing should not prevent you from placing an ordinary order. Marketing messages must identify the sender and provide a practical way to opt out.

5. WHEN INFORMATION MAY BE SHARED
Information may be shared only where reasonably necessary and lawful, including with:
• DASMARKET and its hosting, security and technical service providers to operate the storefront and marketplace;
• the payment provider or merchant service involved in processing or confirming the payment;
• delivery or collection partners who need the relevant details to hand over an order;
• professional advisers, auditors or insurers where appropriate; and
• public authorities or other parties where disclosure is required or permitted by law.
The Seller should not sell buyer contact details or disclose them to unrelated parties for their own marketing.

6. SECURITY AND ACCESS
The Seller must take reasonable technical and organisational measures to protect buyer information against unauthorised access, loss, alteration or disclosure. Access should be limited to people who need the information for authorised shop operations. The Seller is responsible for protecting its shop account, staff access and devices and for promptly addressing suspected unauthorised access or disclosure.

7. RETENTION AND DELETION
The Seller should retain personal information only for as long as reasonably necessary for the purpose for which it was collected, legitimate business records, dispute handling and applicable legal obligations. Information that is no longer needed should be securely deleted, anonymised or otherwise disposed of. Some transaction records may need to be retained for a period required by law.

8. YOUR PRIVACY RIGHTS
Subject to applicable law and any lawful exceptions, you may have rights to request access to your personal information, correction of inaccurate information, deletion, restriction or objection to certain processing, and withdrawal of consent where processing is based on consent. You may also raise a complaint with the relevant data-protection authority. To exercise rights concerning information controlled by this Seller, contact the Seller using the details displayed on this page. Requests concerning DASMARKET platform account information should be directed to support@dasmarket.co.ke.

9. CHILDREN
This shop is not intended to collect children’s personal information unnecessarily. Where a transaction involves a child or information relating to a child, the Seller must handle that information in accordance with applicable law and any required parental or guardian authorisation.

10. CROSS-BORDER PROCESSING
Some platform or service providers may process information in locations outside Kenya. Where personal information is transferred across borders, the Seller and relevant service providers must apply safeguards and comply with applicable data-protection requirements.

11. CHANGES TO THIS POLICY
The Seller may update this policy when its practices or legal requirements change. Material changes should be published on this storefront. The current version explains the Seller’s practices at the time you use the shop, without reducing rights provided by law.

12. CONTACT AND QUESTIONS
For questions, access or correction requests relating to information held by this shop, contact \${name} using the phone/WhatsApp or email details displayed at the top of this policy. For DASMARKET platform privacy enquiries, contact support@dasmarket.co.ke. Please do not include passwords, PINs or one-time codes in a privacy request.\`; }
function defaultReturns(name:string){return \`1. CONTACT THE SHOP BEFORE RETURNING AN ITEM
All return, exchange, repair and refund requests must be raised with \${name} using the contact details shown on this storefront. Include your order number, the product concerned, the date received and a clear description of the issue. Do not send an item to an address that the Seller has not confirmed.

2. WHEN TO RAISE A REQUEST
Contact the Seller as soon as reasonably possible after discovering that an item is damaged, defective, incomplete, incorrect, unsafe or materially different from its description. If an order has not arrived within the stated delivery estimate, contact the Seller for an update. Any statutory time limits and consumer rights under applicable Kenyan law continue to apply.

3. CONDITION AND EVIDENCE
Where reasonably possible, keep the item, accessories, labels and original packaging in the condition received while the request is assessed. Provide clear photographs or other relevant evidence if requested. Do not continue using an item where doing so may cause damage or create a safety risk. The Seller must assess requests fairly and must not reject a valid statutory claim solely because original packaging is unavailable where the law does not permit that requirement.

4. ELIGIBILITY AND AVAILABLE REMEDIES
Depending on the circumstances and applicable law, an appropriate remedy may include repair, replacement, exchange, price adjustment or refund. The Seller will explain the assessment and proposed resolution. A product that is simply no longer wanted may be treated differently from an item that is faulty, misdescribed or not supplied as agreed; any such distinction must remain consistent with mandatory consumer law and information provided before purchase.

5. ITEMS THAT MAY HAVE SPECIAL CONDITIONS
Custom-made, personalised, perishable, hygiene-sensitive, digital or electronically supplied products may be subject to special return conditions where permitted by law. Any material restriction must be clearly disclosed before the buyer places an order. No exclusion in this policy removes a remedy that the buyer is legally entitled to.

6. REFUND PROCESS
Where a refund is approved or legally due, the Seller is responsible for arranging it through the original payment channel or another method agreed with the buyer and permitted by law. The Seller should confirm the amount, method and status of the refund. Bank, mobile-money or payment-provider processing times may vary after the Seller initiates the refund. DASMARKET does not hold payments made directly to the Seller and cannot independently guarantee that the Seller has funds available for a refund.

7. RETURN DELIVERY COSTS
Responsibility for reasonable return delivery costs depends on the reason for the return, the agreed sale terms and applicable law. The Seller should explain any cost before the buyer sends an item back. A buyer should not incur an undisclosed return fee.

8. CANCELLATIONS AND UNDELIVERED ORDERS
If you need to cancel an order, contact the Seller immediately. Cancellation may not be possible once an order has been dispatched or specially prepared, subject to applicable law. If the Seller cannot fulfil an order or delivery fails for reasons attributable to the Seller, the Seller must provide the remedy required by law and the circumstances.

9. NO WAIVER OF LEGAL RIGHTS
This policy is a general shop procedure and does not replace mandatory consumer protections. Where this policy conflicts with a right or remedy that cannot lawfully be excluded, the applicable law prevails.

10. CUSTOMER SUPPORT
For assistance, contact \${name} using the shop phone/WhatsApp or email shown on this page. Keep your order confirmation, payment reference and relevant messages until the matter is resolved.\`; }
function defaultDelivery(name:string){return \`1. DELIVERY AND COLLECTION OPTIONS
\${name} will make available the delivery or collection methods shown at checkout or confirmed directly with the buyer. Availability may depend on the product, destination, stock location and practical delivery arrangements. Please review the available method before completing payment.

2. DELIVERY AREAS
The Seller should confirm the counties, towns, estates or other locations it can serve. If your destination is outside the available area, contact the Seller before placing the order. The Seller must not accept payment for a delivery arrangement it cannot reasonably fulfil without first explaining the limitation and agreeing an alternative.

3. DELIVERY CHARGES
Any delivery charge configured for home delivery or pickup/collection should be displayed in the checkout summary before payment. Charges may vary by destination, size, weight or delivery method where this is clearly explained before the order is confirmed. No additional undisclosed delivery fee should be demanded after checkout.

4. ORDER PROCESSING AND ESTIMATED TIMING
Processing begins after the Seller has accepted the order and confirmed the required payment status. Dispatch and delivery estimates depend on stock availability, destination, carrier capacity and other operational factors. The Seller should communicate a reasonable estimate and promptly notify the buyer of a material delay. An estimate is not a guarantee unless the Seller expressly confirms a guaranteed date or time.

5. ADDRESS AND CONTACT DETAILS
Buyers must provide a complete and accurate delivery address, county, sub-county, town or estate, building or landmark details and a reachable telephone number. The Seller may contact the buyer to clarify directions or arrange a suitable handover. Delays caused by incomplete or incorrect information should be discussed promptly rather than resulting in an unexplained failed delivery.

6. RECEIVING AN ORDER
Where possible, the buyer or an authorised recipient should inspect the package at handover and promptly report visible damage, missing items or an incorrect delivery. A signature, delivery code or other confirmation may be requested as proof of handover. Do not share account passwords, payment PINs or one-time security codes as proof of delivery.

7. FAILED OR MISSED DELIVERY
If the recipient is unavailable, the address is inaccessible or delivery cannot be completed, the Seller should contact the buyer to agree a reasonable next step. Any re-delivery charge or change of arrangement must be explained and agreed before it is applied, subject to applicable law. The Seller should not treat a failed attempt as an automatic forfeiture of the buyer’s payment.

8. COLLECTION
Where collection is offered, the Seller will confirm the collection point, operating hours and when the order is ready. Buyers should wait for that confirmation before travelling. The person collecting may be asked to provide the order number and reasonable proof that they are authorised to collect. Collection fees, if any, should be shown before payment.

9. DELAYS, DAMAGE OR LOSS
If an order is delayed, damaged in transit or reported missing, contact the Seller using the details on this page and provide the order number. The Seller is responsible for coordinating with its delivery partner and keeping the buyer informed. Nothing in this policy removes obligations imposed on the Seller by applicable consumer law.

10. CONTACT AND DELIVERY QUESTIONS
For delivery estimates, coverage, collection arrangements or an order that has not arrived, contact \${name} using the phone/WhatsApp or email shown on this page. Please have your order number available.\`; }
export function SellerShopControls({section,shopName='Your shop',shopWhatsappNumber='',shopContactEmail='',onNotice}:Props){
 const [policy,setPolicy]=useState<any>(emptyPolicy),[coupons,setCoupons]=useState<any[]>([]),[loading,setLoading]=useState(true),[saving,setSaving]=useState(false),[error,setError]=useState(''),[activePolicy,setActivePolicy]=useState('overview'),[preview,setPreview]=useState(true),[faqQuestion,setFaqQuestion]=useState(''),[faqAnswer,setFaqAnswer]=useState('');
 const [draft,setDraft]=useState<any>({code:'',discountType:'percentage',discountValue:'10',minimumOrder:'0',maxUses:'',expiresAt:''});
 const policyDefaults=useMemo(()=>({termsAndConditions:defaultTerms(shopName),privacyPolicy:defaultPrivacy(shopName),returnPolicy:defaultReturns(shopName),deliveryPolicy:defaultDelivery(shopName)}),[shopName]);
 async function load(){setLoading(true);setError('');try{const [a,b]=await Promise.all([fetch('/api/store?action=store-settings',{credentials:'same-origin',cache:'no-store'}),fetch('/api/store?action=coupons',{credentials:'same-origin',cache:'no-store'})]);const [pd,cd]=await Promise.all([responseData(a),responseData(b)]);const saved=pd.settings||{};setPolicy({...emptyPolicy,...saved,contactPhone:saved.contactPhone||shopWhatsappNumber,contactEmail:saved.contactEmail||shopContactEmail,termsAndConditions:saved.termsAndConditions||policyDefaults.termsAndConditions,privacyPolicy:saved.privacyPolicy||policyDefaults.privacyPolicy,returnPolicy:saved.returnPolicy||policyDefaults.returnPolicy,deliveryPolicy:saved.deliveryPolicy||policyDefaults.deliveryPolicy});setCoupons(cd.coupons||[]);}catch(e:any){setError(e.message||'Could not load shop settings.');}finally{setLoading(false);}}
 useEffect(()=>{load();},[section,shopName,shopWhatsappNumber,shopContactEmail]);
 async function savePolicies(e?:any){e?.preventDefault();setSaving(true);setError('');try{await responseData(await fetch('/api/store?action=store-settings',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',body:JSON.stringify(policy)}));onNotice?.('Shop policies and contact details saved and published.');}catch(e:any){setError(e.message||'Could not save settings.');}finally{setSaving(false);}}
 async function addCoupon(e:any){e.preventDefault();setSaving(true);setError('');try{const d=await responseData(await fetch('/api/store?action=coupon',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',body:JSON.stringify(draft)}));setCoupons(v=>[d.coupon,...v]);setDraft({code:'',discountType:'percentage',discountValue:'10',minimumOrder:'0',maxUses:'',expiresAt:''});onNotice?.('Coupon created and published to your shop.');}catch(e:any){setError(e.message||'Could not create coupon.');}finally{setSaving(false);}}
 async function toggleCoupon(c:any){setError('');try{const d=await responseData(await fetch('/api/store?action=coupon',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',body:JSON.stringify({id:c.id,isActive:!c.is_active})}));setCoupons(v=>v.map(x=>x.id===c.id?d.coupon:x));}catch(e:any){setError(e.message||'Could not update coupon.');}}
 async function deleteCoupon(id:string){if(!window.confirm('Delete this coupon?'))return;try{await responseData(await fetch('/api/store?action=coupon&id='+encodeURIComponent(id),{method:'DELETE',credentials:'same-origin'}));setCoupons(v=>v.filter(x=>x.id!==id));}catch(e:any){setError(e.message||'Could not delete coupon.');}}
 if(loading)return <div className="seller-loading"><span className="seller-spinner"/>Loading shop controls…</div>;
 const active=policySections.find(x=>x.id===activePolicy)||policySections[0];
 const field='field' in active?active.field:null;
 const content=field?String(policy[field]||''):'';
 const update=(key:string,value:any)=>setPolicy((p:any)=>({...p,[key]:value}));
 const contactPhone=policy.contactPhone||shopWhatsappNumber||'Not added yet';
 const contactEmail=policy.contactEmail||shopContactEmail||'Not added yet';
 return <section className="seller-shop-controls seller-policy-center">
  {section==='policies'?<>
   <header className="seller-policy-heading"><div><span className="seller-policy-eyebrow">STOREFRONT SETTINGS</span><h2>Shop policies</h2><p>Manage the information buyers see before and after placing an order. Your shop identity and contact details are automatically shown with every policy.</p></div><button type="button" className="seller-primary-btn" onClick={()=>savePolicies()} disabled={saving}><Save size={16}/>{saving?'Publishing…':'Save & publish'}</button></header>
   <div className="seller-policy-identity"><div className="seller-policy-shop-icon"><Store size={21}/></div><div className="seller-policy-shop-copy"><strong>{shopName}</strong><span>Shop identity · Automatically displayed on buyer-facing policy pages</span></div><div className="seller-policy-contact-chip"><Phone size={14}/>{contactPhone}</div><div className="seller-policy-contact-chip"><Mail size={14}/>{contactEmail}</div></div>
   <div className="seller-policy-layout">
    <nav className="seller-policy-nav" aria-label="Shop policy sections">{policySections.map(item=><button type="button" key={item.id} className={activePolicy===item.id?'active':''} onClick={()=>setActivePolicy(item.id)}><item.icon size={17}/><span>{item.label}</span>{activePolicy===item.id&&<span className="seller-policy-nav-dot"/>}</button>)}</nav>
    <div className="seller-policy-main">
     <div className="seller-policy-section-head"><div><h3>{active.title}</h3><p>{activePolicy==='overview'?'Your public shop details and the publishing status of each buyer-facing policy.':activePolicy==='contact'?'Buyers use these details for order questions, returns and delivery support.':activePolicy==='faqs'?'Add clear answers to the questions buyers ask most often.':('hint' in active ? active.hint : '')}</p></div><button type="button" className="seller-policy-preview-toggle" onClick={()=>setPreview(!preview)}><Eye size={15}/>{preview?'Hide preview':'Show preview'}</button></div>
     {activePolicy==='overview'&&<div className="seller-policy-overview-grid">{policySections.filter(x=>x.id!=='overview').map(item=><button type="button" key={item.id} onClick={()=>setActivePolicy(item.id)} className="seller-policy-overview-card"><span className="seller-policy-overview-icon"><item.icon size={18}/></span><strong>{item.title}</strong><small>{item.id==='contact'?'Shop phone and email':item.id==='faqs'?(policy.faqs||[]).length+' published answers':String(policy[item.field as string]||'').trim()?'Ready to publish':'Default draft ready'}</small><span className="seller-policy-edit"><PencilLine size={13}/> Edit</span></button>)}</div>}
     {field&&<div className="seller-policy-editor-card"><label className="seller-policy-field-label" htmlFor={'policy-'+field}>Your shop policy</label><textarea id={'policy-'+field} rows={17} maxLength={field==='termsAndConditions'||field==='privacyPolicy'?20000:12000} value={content} onChange={e=>update(field,e.target.value)}/><div className="seller-policy-editor-foot"><span>{content.length.toLocaleString()} characters · Buyers see the published text</span><button type="button" className="seller-policy-reset" onClick={()=>update(field,policyDefaults[field as keyof typeof policyDefaults])}>Restore suggested draft</button></div></div>}
     {activePolicy==='contact'&&<div className="seller-policy-contact-form"><label>Customer support phone<input type="tel" value={policy.contactPhone||''} onChange={e=>update('contactPhone',e.target.value)} placeholder="0712 345 678 or +254712345678"/><small>Defaults to the WhatsApp number saved in Shop Settings. This number appears on policy pages and shop contact links.</small></label><label>Customer support email<input type="email" value={policy.contactEmail||''} onChange={e=>update('contactEmail',e.target.value)} placeholder="support@yourshop.co.ke"/><small>Defaults to the shop email address when one is available.</small></label><div className="seller-policy-contact-preview"><strong>Buyer-facing contact card</strong><b>{shopName}</b><span><Phone size={14}/>{contactPhone}</span><span><Mail size={14}/>{contactEmail}</span></div></div>}
     {activePolicy==='delivery'&&<div className="seller-policy-fees"><h4>Checkout delivery charges</h4><p>These charges are added automatically to the buyer’s checkout total and saved with each order. Enter 0 for free delivery or collection.</p><label>Home delivery fee (KES)<input type="number" min="0" max="1000000" step="0.01" value={policy.deliveryHomeFee??0} onChange={e=>update('deliveryHomeFee',e.target.value)}/></label><label>Pickup / collection fee (KES)<input type="number" min="0" max="1000000" step="0.01" value={policy.deliveryPickupFee??0} onChange={e=>update('deliveryPickupFee',e.target.value)}/></label></div>}
     {activePolicy==='faqs'&&<div className="seller-policy-faqs"><label>Question<input maxLength={240} value={faqQuestion} onChange={e=>setFaqQuestion(e.target.value)} placeholder="e.g. How long does delivery take?"/></label><label>Answer<textarea rows={3} maxLength={2000} value={faqAnswer} onChange={e=>setFaqAnswer(e.target.value)} placeholder="Write a clear answer for your customers."/></label><button type="button" className="seller-secondary-btn" onClick={()=>{if(faqQuestion.trim().length<3||faqAnswer.trim().length<3){setError('Enter an FAQ question and answer.');return;}if((policy.faqs||[]).length>=30){setError('You can publish up to 30 FAQs.');return;}update('faqs',[...(policy.faqs||[]),{question:faqQuestion.trim(),answer:faqAnswer.trim()}]);setFaqQuestion('');setFaqAnswer('');setError('');}}><Plus size={14}/> Add FAQ</button>{(policy.faqs||[]).map((faq:any,index:number)=><article className="seller-policy-faq-row" key={index}><div><strong>{faq.question}</strong><p>{faq.answer}</p></div><button type="button" onClick={()=>update('faqs',policy.faqs.filter((_:any,i:number)=>i!==index))}><Trash2 size={15}/></button></article>)}</div>}
     {preview&&activePolicy!=='overview'&&activePolicy!=='faqs'&&<aside className="seller-policy-live-preview"><div className="seller-policy-preview-top"><span><Eye size={14}/> BUYER PREVIEW</span><CheckCircle2 size={17}/></div><div className="seller-policy-preview-brand"><span>{shopName}</span><small>SHOP POLICY</small></div><h4>{active.title}</h4>{activePolicy==='contact'?<><p>{shopName}</p><p>Phone: {contactPhone}</p><p>Email: {contactEmail}</p></>:<p className="seller-policy-preview-text">{content}</p>}<div className="seller-policy-preview-contact"><Phone size={13}/>{contactPhone}<span>·</span><Mail size={13}/>{contactEmail}</div></aside>}
     <div className="seller-policy-bottom-actions"><span><ShieldCheck size={15}/> DASMARKET minimum platform notices remain visible to buyers and cannot be removed.</span><button type="button" className="seller-primary-btn" onClick={()=>savePolicies()} disabled={saving}><Save size={15}/>{saving?'Saving…':'Save changes'}</button></div>
    </div>
   </div>
  </>:<><div className="seller-page-heading"><div><h2>Coupons & promotions</h2><p>Create discount codes buyers can view and redeem during checkout.</p></div></div><form className="seller-editor seller-settings-form" onSubmit={addCoupon}><h3><TicketPercent size={17}/> Create a coupon</h3><label>Coupon code<input required maxLength={32} value={draft.code} onChange={e=>setDraft({...draft,code:e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g,'')})} placeholder="WELCOME10"/></label><label>Discount type<select value={draft.discountType} onChange={e=>setDraft({...draft,discountType:e.target.value})}><option value="percentage">Percentage (%)</option><option value="fixed">Fixed amount (KES)</option></select></label><label>Discount value<input type="number" required min="0.01" step="0.01" value={draft.discountValue} onChange={e=>setDraft({...draft,discountValue:e.target.value})}/></label><label>Minimum order (KES)<input type="number" min="0" step="1" value={draft.minimumOrder} onChange={e=>setDraft({...draft,minimumOrder:e.target.value})}/></label><label>Maximum redemptions<input type="number" min="1" step="1" value={draft.maxUses} onChange={e=>setDraft({...draft,maxUses:e.target.value})} placeholder="Unlimited"/></label><label>Expiry date<input type="date" value={draft.expiresAt} onChange={e=>setDraft({...draft,expiresAt:e.target.value})}/></label><button className="seller-primary-btn" disabled={saving}><Plus size={15}/>{saving?'Saving…':'Create coupon'}</button></form><div className="seller-table-panel"><div className="seller-table-scroll"><table className="seller-table"><thead><tr><th>Code</th><th>Offer</th><th>Redemptions</th><th>Expiry</th><th>Status</th><th>Actions</th></tr></thead><tbody>{coupons.map(c=><tr key={c.id}><td><strong>{c.code}</strong></td><td>{c.discount_type==='percentage'?c.discount_value+'% off':'KES '+Number(c.discount_value).toLocaleString('en-KE')+' off'}<small>Minimum KES {(Number(c.minimum_order_minor||0)/100).toLocaleString('en-KE')}</small></td><td>{c.used_count}{c.max_uses?' / '+c.max_uses:' / ∞'}</td><td>{c.expires_at?new Date(c.expires_at).toLocaleDateString('en-KE'):'No expiry'}</td><td><span className={c.is_active?'seller-status-success':'seller-status-muted'}>{c.is_active?'Active':'Paused'}</span></td><td><button type="button" className="seller-secondary-btn" onClick={()=>toggleCoupon(c)}>{c.is_active?'Pause':'Activate'}</button> <button type="button" className="seller-secondary-btn" onClick={()=>deleteCoupon(c.id)}><Trash2 size={14}/></button></td></tr>)}</tbody></table>{!coupons.length&&<p className="seller-empty">No coupons yet. Create your first discount code above.</p>}</div></div></>}
  {error&&<p className="auth-message error seller-alert" role="alert">{error}</p>}
 </section>;
}
