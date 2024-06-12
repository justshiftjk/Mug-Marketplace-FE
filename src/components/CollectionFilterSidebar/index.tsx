import { SidebarPropsType } from "@/types/types";
import { CloseIcon } from "../SvgIcons";
import { CgClose } from "react-icons/cg";

export default function CollectionFilterSidebar({
  filterOpen,
  onClosebar,
}: SidebarPropsType) {
  return (
    <div
      className={`border-r-[1px] border-customborder h-[93vh] relative duration-200 hidden lg:block ${
        filterOpen
          ? "opacity-100 w-[300px] pr-[8px] pointer-events-auto"
          : "opacity-0 w-0 pr-0 pointer-events-none"
      }`}
    >
      <div
        className="absolute top-1 right-3 cursor-pointer"
        onClick={onClosebar}
      >
        <CgClose color="white" size={20} />
      </div>
      <h1 className="text-2xl text-white mt-5">Filter</h1>
      <div className="w-full flex items-center justify-center gap-2 flex-col mt-3 border-b-[1px] border-customborder py-2">
        <div className="w-full flex items-center justify-between">
          <div className="flex items-center justify-center gap-1">
            <input type="radio" className="" />
            <p className="text-white text-md">Show all</p>
          </div>
          <span className="text-gray-300">
            {Number(123123).toLocaleString()}
          </span>
        </div>
        <div className="w-full flex items-center justify-between">
          <div className="flex items-center justify-center gap-1">
            <input type="radio" className="" />
            <p className="text-white text-md">Buy now</p>
          </div>
          <span className="text-gray-300">
            {Number(123123).toLocaleString()}
          </span>
        </div>
      </div>
      <div className="w-full flex items-center justify-center gap-2 flex-col mt-3 border-b-[1px] border-customborder py-2">
        <div className="w-full flex items-center justify-between">
          <p className="text-white">Price</p>
          {/* <span>
            <ArrowIcon />
          </span> */}
        </div>
        <div className="w-full flex items-center justify-center gap-2">
          <input
            placeholder="Min"
            className="outline-none p-1 text-[12px] text-white border rounded-md border-customborder bg-transparent w-[100px]"
            type="number"
          />
          <span className="text-[12px] text-gray-600">to</span>
          <input
            placeholder="Max"
            className="outline-none p-1 text-[12px] text-white border rounded-md border-customborder bg-transparent w-[100px]"
            type="number"
          />
        </div>
      </div>
    </div>
  );
}
