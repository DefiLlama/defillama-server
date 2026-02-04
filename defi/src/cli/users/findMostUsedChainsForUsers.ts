import { addressList } from "../../dimension_migration/users/list";

const count = {} as any
addressList.forEach((c:any)=>{
    Object.keys(c.addresses??{}).forEach(chain=>count[chain]=1+(count[chain]??0))
})
console.log(count)